package xyz.wintercore.detonato.session;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import xyz.wintercore.detonato.MainActivity;
import xyz.wintercore.detonato.R;

/**
 * What the phone shows of a session: the countdown while it's under way,
 * whose clock the system itself runs, so nothing has to stay awake for it;
 * and the end's alert, set as an exact alarm that arrives with the app
 * closed.
 */
final class SessionNotifications {

    /** The end's alert. The same id the app's taps listen for (`lib/notifications › END_ID`). */
    static final int END_ID = 1;
    static final int COUNTDOWN_ID = 2;

    /** Never sounds, and isn't a `session-end` channel, so the app's channel tidying leaves it alone. */
    private static final String COUNTDOWN_CHANNEL = "session-countdown";
    private static final String TIMER_URL = "detonato://timer";

    private static final int OPEN_REQUEST = 0;
    private static final int END_REQUEST = 1;
    private static final int PAUSE_REQUEST = 2;
    private static final int RESUME_REQUEST = 3;
    private static final int STOP_REQUEST = 4;

    private SessionNotifications() {}

    /** The countdown for `session`, running or held, with its buttons. */
    @SuppressLint("MissingPermission")
    static void showCountdown(Context context, Session session) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) {
            return;
        }
        readyCountdownChannel(context);

        RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.notification_session);
        view.setTextViewText(R.id.session_title, session.title);
        long now = System.currentTimeMillis();
        long left = session.left;
        if (session.running()) {
            left = Math.max(0, session.endsAt - now);
        }
        // The clock counts down to the end; held, it stands at what's left.
        view.setChronometer(R.id.session_clock, SystemClock.elapsedRealtime() + left, null, session.running());
        view.setChronometerCountDown(R.id.session_clock, true);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, COUNTDOWN_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_detonato)
            .setColor(session.color)
            .setContentTitle(session.title)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(view)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openTimer(context));

        if (session.running()) {
            view.setTextViewText(R.id.session_body, session.body);
            builder.setContentText(session.body);
            builder.addAction(0, "Pause", button(context, SessionReceiver.PAUSE, PAUSE_REQUEST));
            // Gone by itself at the end, should the alarm that replaces it be late.
            builder.setTimeoutAfter(left);
        } else {
            String held = "Paused · " + session.body;
            view.setTextViewText(R.id.session_body, held);
            builder.setContentText(held);
            builder.addAction(0, "Resume", button(context, SessionReceiver.RESUME, RESUME_REQUEST));
        }
        builder.addAction(0, "Stop", button(context, SessionReceiver.STOP, STOP_REQUEST));

        manager.notify(COUNTDOWN_ID, builder.build());
    }

    static void hideCountdown(Context context) {
        NotificationManagerCompat.from(context).cancel(COUNTDOWN_ID);
    }

    /** The end's alert, from the alarm that `armEnd` set. */
    @SuppressLint("MissingPermission")
    static void showEnd(Context context, Intent alarm) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) {
            return;
        }
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, alarm.getStringExtra("channelId"))
            .setSmallIcon(R.drawable.ic_stat_detonato)
            .setColor(alarm.getIntExtra("color", 0))
            .setContentTitle(alarm.getStringExtra("endTitle"))
            .setContentText(alarm.getStringExtra("endBody"))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openTimer(context));

        // Before channels, the sound and the buzz are the notification's own.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            String sound = alarm.getStringExtra("sound");
            if (sound != null && !sound.isEmpty()) {
                String name = sound.replaceFirst("\\.[^.]+$", "");
                builder.setSound(Uri.parse("android.resource://" + context.getPackageName() + "/raw/" + name));
            }
            if (alarm.getBooleanExtra("haptics", false)) {
                builder.setDefaults(Notification.DEFAULT_VIBRATE);
            }
        }
        manager.notify(END_ID, builder.build());
    }

    /** The end's alarm, at `session.endsAt`. Replaces any set before: there's one session at a time. */
    static void armEnd(Context context, Session session) {
        Intent intent = new Intent(context, SessionReceiver.class)
            .setAction(SessionReceiver.END)
            .putExtra("endsAt", session.endsAt)
            .putExtra("endTitle", session.endTitle)
            .putExtra("endBody", session.endBody)
            .putExtra("channelId", session.channelId)
            .putExtra("sound", session.sound)
            .putExtra("haptics", session.haptics)
            .putExtra("color", session.color);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            END_REQUEST,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        // Exact, as a timer's must be; Android 12 lets the user refuse that, and then it's as close as the phone allows.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, session.endsAt, pending);
            return;
        }
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, session.endsAt, pending);
    }

    /** The end's alarm taken back, if one is set. An alert already showing stays. */
    static void disarmEnd(Context context) {
        Intent intent = new Intent(context, SessionReceiver.class).setAction(SessionReceiver.END);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            END_REQUEST,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE
        );
        if (pending == null) {
            return;
        }
        context.getSystemService(AlarmManager.class).cancel(pending);
        pending.cancel();
    }

    /** A tap opens the app on the timer: `@capacitor/app` reports the URL, and the app goes there. */
    private static PendingIntent openTimer(Context context) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(TIMER_URL), context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            OPEN_REQUEST,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    private static PendingIntent button(Context context, String action, int request) {
        Intent intent = new Intent(context, SessionReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(
            context,
            request,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    private static void readyCountdownChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        // Default, not low: a low channel is folded away under «Silent», with no icon in the status bar.
        // It still never makes a sound or buzzes.
        NotificationChannel channel = new NotificationChannel(
            COUNTDOWN_CHANNEL,
            "Session under way",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("The countdown while a session runs, with Pause and Stop.");
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setShowBadge(false);
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
}

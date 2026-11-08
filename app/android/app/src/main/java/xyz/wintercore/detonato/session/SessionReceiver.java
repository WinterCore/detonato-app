package xyz.wintercore.detonato.session;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * The countdown's buttons, the end's alarm, and the phone starting up — all
 * of which may come with the app closed. A button moves the session as the
 * app would, shows it at once, and keeps the move for the app to replay.
 */
public class SessionReceiver extends BroadcastReceiver {

    static final String PAUSE = "xyz.wintercore.detonato.session.PAUSE";
    static final String RESUME = "xyz.wintercore.detonato.session.RESUME";
    static final String STOP = "xyz.wintercore.detonato.session.STOP";
    static final String END = "xyz.wintercore.detonato.session.END";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) {
            return;
        }
        long now = System.currentTimeMillis();
        switch (action) {
            case PAUSE:
                pause(context, now);
                break;
            case RESUME:
                resume(context, now);
                break;
            case STOP:
                stop(context, now);
                break;
            case END:
                end(context, intent);
                break;
            case Intent.ACTION_BOOT_COMPLETED:
            case Intent.ACTION_MY_PACKAGE_REPLACED:
                restore(context, now);
                break;
            default:
                break;
        }
    }

    private static void pause(Context context, long now) {
        Session session = SessionStore.read(context);
        if (session == null || !session.pause(now)) {
            return;
        }
        SessionNotifications.disarmEnd(context);
        SessionStore.write(context, session);
        SessionNotifications.showCountdown(context, session);
        moved(context, "pause", now);
    }

    private static void resume(Context context, long now) {
        Session session = SessionStore.read(context);
        if (session == null || !session.resume(now)) {
            return;
        }
        SessionStore.write(context, session);
        SessionNotifications.armEnd(context, session);
        SessionNotifications.showCountdown(context, session);
        moved(context, "resume", now);
    }

    private static void stop(Context context, long now) {
        SessionNotifications.disarmEnd(context);
        SessionNotifications.hideCountdown(context);
        SessionStore.forget(context);
        moved(context, "stop", now);
    }

    /** The end came: the countdown gives way to the alert. */
    private static void end(Context context, Intent alarm) {
        SessionNotifications.hideCountdown(context);
        SessionNotifications.showEnd(context, alarm);
        Session session = SessionStore.read(context);
        if (session != null && session.running() && session.endsAt == alarm.getLongExtra("endsAt", -1)) {
            SessionStore.forget(context);
        }
    }

    /** A reboot loses alarms and notifications: both come back, or the end, if it passed meanwhile. */
    private static void restore(Context context, long now) {
        Session session = SessionStore.read(context);
        if (session == null) {
            return;
        }
        if (!session.running()) {
            SessionNotifications.showCountdown(context, session);
            return;
        }
        if (session.endsAt > now) {
            if (session.alert) {
                SessionNotifications.armEnd(context, session);
            }
            SessionNotifications.showCountdown(context, session);
            return;
        }
        SessionStore.forget(context);
        if (session.alert) {
            // The same alarm, set for a moment already gone, goes off at once.
            SessionNotifications.armEnd(context, session);
        }
    }

    private static void moved(Context context, String move, long at) {
        SessionStore.queue(context, move, at);
        SessionNoticePlugin.commandsWaiting();
    }
}

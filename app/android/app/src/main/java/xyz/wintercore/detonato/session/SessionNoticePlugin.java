package xyz.wintercore.detonato.session;

import android.content.Context;
import android.graphics.Color;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

/**
 * The app's side of the session's notification (`lib/sessionNotice`): it
 * hands over the session as it stands, and takes the moves made on the
 * buttons. While the app runs, a move tells it at once (`commands`).
 */
@CapacitorPlugin(name = "SessionNotice")
public class SessionNoticePlugin extends Plugin {

    private static WeakReference<SessionNoticePlugin> live = new WeakReference<>(null);

    @Override
    public void load() {
        live = new WeakReference<>(this);
    }

    /** Moves are waiting: the app, if it's running, takes them now. */
    static void commandsWaiting() {
        SessionNoticePlugin plugin = live.get();
        if (plugin == null) {
            return;
        }
        plugin.notifyListeners("commands", new JSObject());
    }

    @PluginMethod
    public void show(PluginCall call) {
        Session session = new Session();
        session.phase = call.getString("phase", "");
        if (!Session.RUNNING.equals(session.phase) && !Session.PAUSED.equals(session.phase)) {
            call.reject("A session is shown running or paused.");
            return;
        }
        // Not getLong: it reads only numbers that arrived as longs, and a short `left` arrives as an int.
        session.endsAt = call.getData().optLong("endsAt");
        session.left = call.getData().optLong("left");
        session.length = call.getData().optLong("length");
        session.title = call.getString("title", "");
        session.body = call.getString("body", "");
        session.endTitle = call.getString("endTitle", "");
        session.endBody = call.getString("endBody", "");
        session.channelId = call.getString("channelId", "");
        session.sound = call.getString("sound", "");
        session.haptics = Boolean.TRUE.equals(call.getBoolean("haptics", false));
        session.color = color(call.getString("color", ""));
        session.alert = session.running();

        Context context = getContext();
        SessionStore.write(context, session);
        if (session.alert) {
            SessionNotifications.armEnd(context, session);
        } else {
            SessionNotifications.disarmEnd(context);
        }
        SessionNotifications.showCountdown(context, session);
        call.resolve();
    }

    /** The end's alarm taken back, the countdown left: the app is in front to tell the end itself. */
    @PluginMethod
    public void takeBack(PluginCall call) {
        Context context = getContext();
        SessionNotifications.disarmEnd(context);
        Session session = SessionStore.read(context);
        if (session != null) {
            session.alert = false;
            SessionStore.write(context, session);
        }
        call.resolve();
    }

    /** The countdown put away; any alert set or showing stays: the session is done. */
    @PluginMethod
    public void hide(PluginCall call) {
        Context context = getContext();
        SessionNotifications.hideCountdown(context);
        SessionStore.forget(context);
        call.resolve();
    }

    /** The countdown put away and the end's alarm taken back: the session was stopped. */
    @PluginMethod
    public void clear(PluginCall call) {
        Context context = getContext();
        SessionNotifications.disarmEnd(context);
        SessionNotifications.hideCountdown(context);
        SessionStore.forget(context);
        call.resolve();
    }

    @PluginMethod
    public void takeCommands(PluginCall call) {
        JSObject result = new JSObject();
        result.put("commands", SessionStore.take(getContext()));
        call.resolve(result);
    }

    private static int color(String hex) {
        try {
            return Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            return 0;
        }
    }
}

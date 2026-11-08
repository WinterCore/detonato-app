package xyz.wintercore.detonato.session;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * What survives the app being closed: the session the phone shows, so the
 * buttons, the end's alarm and a reboot can act on it; and the moves made on
 * the buttons, oldest first, until the app takes them to replay.
 */
final class SessionStore {

    private static final String PREFS = "detonato.session";
    private static final String SESSION = "session";
    private static final String COMMANDS = "commands";

    private SessionStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized Session read(Context context) {
        String raw = prefs(context).getString(SESSION, null);
        if (raw == null) {
            return null;
        }
        try {
            return Session.fromJson(new JSONObject(raw));
        } catch (JSONException e) {
            return null;
        }
    }

    static synchronized void write(Context context, Session session) {
        try {
            prefs(context).edit().putString(SESSION, session.toJson().toString()).commit();
        } catch (JSONException e) {
            forget(context);
        }
    }

    static synchronized void forget(Context context) {
        prefs(context).edit().remove(SESSION).commit();
    }

    /** A move made on the notification at `at`, kept for the app: `core/timer › NoticeCommand`. */
    static synchronized void queue(Context context, String move, long at) {
        JSONArray commands = commands(context);
        try {
            JSONObject command = new JSONObject();
            command.put("move", move);
            command.put("at", at);
            commands.put(command);
        } catch (JSONException e) {
            return;
        }
        prefs(context).edit().putString(COMMANDS, commands.toString()).commit();
    }

    /** The moves waiting, oldest first, handed over once: they're gone from here after. */
    static synchronized JSONArray take(Context context) {
        JSONArray commands = commands(context);
        prefs(context).edit().remove(COMMANDS).commit();
        return commands;
    }

    private static JSONArray commands(Context context) {
        String raw = prefs(context).getString(COMMANDS, null);
        if (raw == null) {
            return new JSONArray();
        }
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }
}

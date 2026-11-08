package xyz.wintercore.detonato.session;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * The session under way, as the phone shows it: running towards `endsAt`, or
 * held with `left` to go. It's what the app last handed over
 * (`lib/sessionNotice › showSession`), moved on by the notification's own
 * buttons with the same rules as the app's (`core/timer`).
 */
final class Session {

    static final String RUNNING = "running";
    static final String PAUSED = "paused";

    String phase;
    /** Running: when it ends, in epoch ms. */
    long endsAt;
    /** Paused: the milliseconds left. */
    long left;
    long length;
    String title;
    String body;
    String endTitle;
    String endBody;
    /** The end's channel, with its sound and buzz (`core/sounds › endChannel`). */
    String channelId;
    /** The end's sound, a file in res/raw, for phones older than channels; empty for none. */
    String sound;
    boolean haptics;
    int color;
    /** Whether the end's alarm is set: off while held, or once the app took it back to tell the end itself. */
    boolean alert;

    boolean running() {
        return RUNNING.equals(phase);
    }

    /** Held where it is: `pauseTimer`. False when it's over or already held. */
    boolean pause(long now) {
        if (!running() || now >= endsAt) {
            return false;
        }
        phase = PAUSED;
        left = endsAt - now;
        endsAt = 0;
        alert = false;
        return true;
    }

    /** Running again with the time that was left: `resumeTimer`. False unless it was held. */
    boolean resume(long now) {
        if (!PAUSED.equals(phase)) {
            return false;
        }
        phase = RUNNING;
        endsAt = now + left;
        left = 0;
        alert = true;
        return true;
    }

    JSONObject toJson() throws JSONException {
        JSONObject o = new JSONObject();
        o.put("phase", phase);
        o.put("endsAt", endsAt);
        o.put("left", left);
        o.put("length", length);
        o.put("title", title);
        o.put("body", body);
        o.put("endTitle", endTitle);
        o.put("endBody", endBody);
        o.put("channelId", channelId);
        o.put("sound", sound);
        o.put("haptics", haptics);
        o.put("color", color);
        o.put("alert", alert);
        return o;
    }

    /** A session read back; null for anything that isn't a sound one. */
    static Session fromJson(JSONObject o) {
        Session s = new Session();
        s.phase = o.optString("phase");
        if (!RUNNING.equals(s.phase) && !PAUSED.equals(s.phase)) {
            return null;
        }
        s.endsAt = o.optLong("endsAt");
        s.left = o.optLong("left");
        s.length = o.optLong("length");
        s.title = o.optString("title");
        s.body = o.optString("body");
        s.endTitle = o.optString("endTitle");
        s.endBody = o.optString("endBody");
        s.channelId = o.optString("channelId");
        s.sound = o.optString("sound");
        s.haptics = o.optBoolean("haptics");
        s.color = o.optInt("color");
        s.alert = o.optBoolean("alert");
        return s;
    }
}

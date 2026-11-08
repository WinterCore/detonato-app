import ActivityKit
import Foundation
import UserNotifications

/// The session under way as the phone shows it: what the app last handed
/// over (`lib/sessionNotice › showSession`), moved on by the Live Activity's
/// buttons with the same rules as the app's (`core/timer`).
struct StoredSession: Codable {
    var running: Bool
    /// Running: when it ends, in epoch ms.
    var endsAt: Double
    /// Held: the milliseconds left.
    var left: Double
    var title: String
    var body: String
    var endTitle: String
    var endBody: String
    /// The end's sound, a file in the web assets (public/); empty for none.
    var sound: String
    /// The LED colour, #rrggbb.
    var color: String
    /// Whether the end's alert is with the phone: not while held, nor once the app took it back to tell the end itself.
    var alert: Bool
}

/// The Live Activity and the end's alert, kept here so that the app
/// (SessionNoticePlugin) and the activity's buttons (SessionIntents) act
/// alike — the buttons with the app closed. A button's move is kept until the
/// app takes it to replay (`core/timer › replay`).
enum SessionLive {
    /// The end's alert: the id the app's taps listen for (`lib/notifications › END_ID`).
    static let endId = "1"
    /// Posted when a button made a move, so a running app takes it at once.
    static let commandsWaiting = Notification.Name("xyz.wintercore.detonato.session.commands")

    private static let sessionKey = "detonato.session"
    private static let commandsKey = "detonato.session.commands"
    private static let defaults = UserDefaults.standard

    // MARK: From the app

    /// The session, running or held. Running, the end's alert is handed over; held, taken back.
    static func show(_ session: StoredSession) async {
        save(session)
        if session.alert {
            await armEnd(session)
        } else {
            disarmEnd()
        }
        await present(session)
    }

    /// The end's alert taken back, the activity left: the app is in front to tell the end itself.
    static func takeBack() {
        disarmEnd()
        guard var session = load() else {
            return
        }
        session.alert = false
        save(session)
    }

    /// The activity put away; an alert set or showing stays: the session is done.
    static func hide() async {
        forget()
        await endActivity()
    }

    /// The activity put away and the end's alert taken back: the session was stopped.
    static func clear() async {
        disarmEnd()
        forget()
        await endActivity()
    }

    /// The moves waiting, oldest first, handed over once.
    static func takeCommands() -> [[String: Any]] {
        let commands = defaults.array(forKey: commandsKey) as? [[String: Any]] ?? []
        defaults.removeObject(forKey: commandsKey)
        return commands
    }

    // MARK: From the buttons

    /// Held where it is: `pauseTimer`. Nothing once it's over.
    static func pause(at date: Date) async {
        let now = date.timeIntervalSince1970 * 1000
        guard var session = load(), session.running, now < session.endsAt else {
            return
        }
        session.running = false
        session.left = session.endsAt - now
        session.endsAt = 0
        session.alert = false
        disarmEnd()
        save(session)
        await present(session)
        moved("pause", at: now)
    }

    /// Running again with the time that was left: `resumeTimer`.
    static func resume(at date: Date) async {
        let now = date.timeIntervalSince1970 * 1000
        guard var session = load(), !session.running else {
            return
        }
        session.running = true
        session.endsAt = now + session.left
        session.left = 0
        session.alert = true
        save(session)
        await armEnd(session)
        await present(session)
        moved("resume", at: now)
    }

    /// Called off: nothing is kept of it.
    static func stop(at date: Date) async {
        let now = date.timeIntervalSince1970 * 1000
        disarmEnd()
        forget()
        await endActivity()
        moved("stop", at: now)
    }

    // MARK: The activity

    private static func present(_ session: StoredSession) async {
        guard #available(iOS 16.2, *) else {
            return
        }
        let state = SessionAttributes.ContentState(
            running: session.running,
            endsAt: Date(timeIntervalSince1970: session.endsAt / 1000),
            left: session.left / 1000,
            title: session.title,
            body: session.body,
            color: session.color
        )
        let content = ActivityContent(state: state, staleDate: staleDate(session))
        if let activity = Activity<SessionAttributes>.activities.first {
            await activity.update(content)
            return
        }
        do {
            _ = try Activity.request(attributes: SessionAttributes(), content: content, pushType: nil)
        } catch {
            // Live Activities are off for Detonato in the phone's settings: the session stays in the app.
            print("Detonato: no Live Activity: \(error)")
        }
    }

    /// Running, the activity goes stale at the end and reads «Session done»: it can't end itself, the app ends it.
    private static func staleDate(_ session: StoredSession) -> Date? {
        if !session.running {
            return nil
        }
        return Date(timeIntervalSince1970: session.endsAt / 1000)
    }

    private static func endActivity() async {
        guard #available(iOS 16.2, *) else {
            return
        }
        for activity in Activity<SessionAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    // MARK: The end's alert

    private static func armEnd(_ session: StoredSession) async {
        let content = UNMutableNotificationContent()
        content.title = session.endTitle
        content.body = session.endBody
        if !session.sound.isEmpty {
            // As the notifications plugin finds it: the web assets' copy, by its folder.
            content.sound = UNNotificationSound(named: UNNotificationSoundName("public/\(session.sound)"))
        }
        let wait = max(1, session.endsAt / 1000 - Date().timeIntervalSince1970)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: wait, repeats: false)
        let request = UNNotificationRequest(identifier: endId, content: content, trigger: trigger)
        do {
            try await UNUserNotificationCenter.current().add(request)
        } catch {
            print("Detonato: the end's alert wasn't set: \(error)")
        }
    }

    private static func disarmEnd() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [endId])
    }

    // MARK: Kept on the phone

    private static func load() -> StoredSession? {
        guard let data = defaults.data(forKey: sessionKey) else {
            return nil
        }
        return try? JSONDecoder().decode(StoredSession.self, from: data)
    }

    private static func save(_ session: StoredSession) {
        guard let data = try? JSONEncoder().encode(session) else {
            return
        }
        defaults.set(data, forKey: sessionKey)
    }

    private static func forget() {
        defaults.removeObject(forKey: sessionKey)
    }

    private static func moved(_ move: String, at: Double) {
        var commands = defaults.array(forKey: commandsKey) as? [[String: Any]] ?? []
        commands.append(["move": move, "at": at])
        defaults.set(commands, forKey: commandsKey)
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: commandsWaiting, object: nil)
        }
    }
}

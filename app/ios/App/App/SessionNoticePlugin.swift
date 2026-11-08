import Capacitor
import Foundation

/// The app's side of the session's Live Activity (`lib/sessionNotice`): it
/// hands over the session as it stands, and takes the moves made on the
/// activity's buttons. While the app runs, a move tells it at once
/// (`commands`).
@objc(SessionNoticePlugin)
public class SessionNoticePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SessionNoticePlugin"
    public let jsName = "SessionNotice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takeBack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takeCommands", returnType: CAPPluginReturnPromise),
    ]

    private var observer: NSObjectProtocol?

    override public func load() {
        observer = NotificationCenter.default.addObserver(
            forName: SessionLive.commandsWaiting,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.notifyListeners("commands", data: [:])
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        let phase = call.getString("phase") ?? ""
        if phase != "running" && phase != "paused" {
            call.reject("A session is shown running or paused.")
            return
        }
        let running = phase == "running"
        let session = StoredSession(
            running: running,
            endsAt: call.getDouble("endsAt") ?? 0,
            left: call.getDouble("left") ?? 0,
            title: call.getString("title") ?? "",
            body: call.getString("body") ?? "",
            endTitle: call.getString("endTitle") ?? "",
            endBody: call.getString("endBody") ?? "",
            sound: call.getString("sound") ?? "",
            color: call.getString("color") ?? "",
            alert: running
        )
        Task {
            await SessionLive.show(session)
            call.resolve()
        }
    }

    @objc func takeBack(_ call: CAPPluginCall) {
        SessionLive.takeBack()
        call.resolve()
    }

    @objc func hide(_ call: CAPPluginCall) {
        Task {
            await SessionLive.hide()
            call.resolve()
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        Task {
            await SessionLive.clear()
            call.resolve()
        }
    }

    @objc func takeCommands(_ call: CAPPluginCall) {
        call.resolve(["commands": SessionLive.takeCommands()])
    }
}

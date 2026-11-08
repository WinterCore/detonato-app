import AppIntents
import Foundation

/*
 * The Live Activity's buttons, from iOS 17. Built into the widget, which
 * draws them, and into the app, where iOS runs them: with the app in the
 * background, or started for just this (SessionLive).
 */

@available(iOS 17.0, *)
struct PauseSessionIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Pause"
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        #if !WIDGET_EXTENSION
        await SessionLive.pause(at: Date())
        #endif
        return .result()
    }
}

@available(iOS 17.0, *)
struct ResumeSessionIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Resume"
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        #if !WIDGET_EXTENSION
        await SessionLive.resume(at: Date())
        #endif
        return .result()
    }
}

@available(iOS 17.0, *)
struct StopSessionIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Stop"
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        #if !WIDGET_EXTENSION
        await SessionLive.stop(at: Date())
        #endif
        return .result()
    }
}

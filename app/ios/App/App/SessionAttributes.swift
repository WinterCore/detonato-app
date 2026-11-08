import ActivityKit
import Foundation

/// The session's Live Activity: what the lock screen and the Dynamic Island
/// draw (SessionActivity/), as the app last handed it over (SessionLive).
/// Built into the app and the widget both.
@available(iOS 16.1, *)
struct SessionAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// Running towards `endsAt`, or held with `left` to go.
        var running: Bool
        var endsAt: Date
        /// Held: the seconds left.
        var left: TimeInterval
        var title: String
        var body: String
        /// The LED colour, #rrggbb.
        var color: String
    }
}

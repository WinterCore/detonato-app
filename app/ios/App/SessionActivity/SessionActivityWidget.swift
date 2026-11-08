import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

/*
 * The session on the lock screen and in the Dynamic Island: the task and its
 * session, the time left in the LED colour, and Pause or Resume and Stop
 * from iOS 17. The clock is the system's own, counting down to the end with
 * nothing running in the app. At the end the activity goes stale and reads
 * «Session done» until the app opens and ends it.
 */

/// The app's ground and inks (styles/tokens.css: bg, ink, ink-2).
private let ground = Color(red: 0x0B / 255, green: 0x0C / 255, blue: 0x0D / 255)
private let ink = Color(red: 0xEB / 255, green: 0xE9 / 255, blue: 0xE4 / 255)
private let ink2 = Color(red: 0xA9 / 255, green: 0xAA / 255, blue: 0xA4 / 255)
/// A tap opens the app on the timer (`lib/notifications › onNoticeTapped`).
private let timerURL = URL(string: "detonato://timer")

struct SessionActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionAttributes.self) { context in
            LockScreen(state: context.state, stale: context.isStale)
                .activityBackgroundTint(ground)
                .activitySystemActionForegroundColor(led(context.state))
                .widgetURL(timerURL)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Titles(state: context.state, stale: context.isStale)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Clock(state: context.state, stale: context.isStale, size: 30)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Buttons(state: context.state, stale: context.isStale)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundStyle(led(context.state))
            } compactTrailing: {
                Clock(state: context.state, stale: context.isStale, size: 15)
                    .frame(maxWidth: 56)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(led(context.state))
            }
            .widgetURL(timerURL)
            .keylineTint(led(context.state))
        }
    }
}

private struct LockScreen: View {
    let state: SessionAttributes.ContentState
    let stale: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center, spacing: 12) {
                Titles(state: state, stale: stale)
                Spacer(minLength: 0)
                Clock(state: state, stale: stale, size: 40)
            }
            Buttons(state: state, stale: stale)
        }
        .padding(16)
    }
}

/// «Deep work» over «Session 2 of 3»; «Paused · …» while held; «Session done» once it's over.
private struct Titles: View {
    let state: SessionAttributes.ContentState
    let stale: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(state.title)
                .font(.headline)
                .foregroundStyle(ink)
                .lineLimit(1)
            Text(line)
                .font(.subheadline)
                .foregroundStyle(ink2)
                .lineLimit(1)
        }
    }

    private var line: String {
        if stale {
            return "Session done"
        }
        if state.running {
            return state.body
        }
        return "Paused · \(state.body)"
    }
}

/// The time left: counting down while it runs, standing still while held.
private struct Clock: View {
    let state: SessionAttributes.ContentState
    let stale: Bool
    let size: CGFloat

    var body: some View {
        text
            .font(.system(size: size, weight: .semibold, design: .monospaced))
            .monospacedDigit()
            .foregroundStyle(led(state))
            .multilineTextAlignment(.trailing)
            .lineLimit(1)
    }

    private var text: Text {
        if stale {
            return Text("00:00")
        }
        if state.running {
            let now = Date()
            return Text(timerInterval: now...max(now, state.endsAt), countsDown: true)
        }
        return Text(clockText(state.left))
    }
}

/// Pause or Resume, and Stop: iOS 17 and later, while the session isn't over.
private struct Buttons: View {
    let state: SessionAttributes.ContentState
    let stale: Bool

    var body: some View {
        if !stale {
            if #available(iOS 17.0, *) {
                HStack(spacing: 8) {
                    if state.running {
                        Button(intent: PauseSessionIntent()) {
                            Label("Pause", systemImage: "pause.fill")
                                .frame(maxWidth: .infinity)
                        }
                    } else {
                        Button(intent: ResumeSessionIntent()) {
                            Label("Resume", systemImage: "play.fill")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    Button(intent: StopSessionIntent()) {
                        Label("Stop", systemImage: "stop.fill")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.bordered)
                .tint(led(state))
                .font(.subheadline.weight(.semibold))
            }
        }
    }
}

/// «24:59», as the app's display shows it (`core/timer › clockText`): seconds round up.
private func clockText(_ seconds: TimeInterval) -> String {
    let whole = Int(seconds.rounded(.up))
    return String(format: "%02d:%02d", whole / 60, whole % 60)
}

/// The LED colour the app handed over; amber for anything unreadable.
private func led(_ state: SessionAttributes.ContentState) -> Color {
    let hex = state.color.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    guard hex.count == 6, let value = UInt32(hex, radix: 16) else {
        return Color(red: 1, green: 0xB0 / 255, blue: 0)
    }
    return Color(
        red: Double((value >> 16) & 0xFF) / 255,
        green: Double((value >> 8) & 0xFF) / 255,
        blue: Double(value & 0xFF) / 255
    )
}

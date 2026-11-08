import Capacitor
import UIKit

/// The app's web view, with the app's own plugins registered on its bridge.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SessionNoticePlugin())
    }
}

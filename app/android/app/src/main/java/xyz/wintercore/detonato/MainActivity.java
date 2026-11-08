package xyz.wintercore.detonato;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import xyz.wintercore.detonato.session.SessionNoticePlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugins, registered before the bridge starts.
        registerPlugin(SessionNoticePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

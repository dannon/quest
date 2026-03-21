import {
  createSystem,
  PanelUI,
  PanelDocument,
  eq,
  UIKitDocument,
  UIKit,
} from '@iwsdk/core';
import { ConnectDialog } from '../components/connect-dialog.js';
import { getPtyHost, getPtyToken, setPtyHost, getSavedHost, getSavedToken } from '../lib/pty-config.js';

export class ConnectDialogSystem extends createSystem({
  dialog: {
    required: [ConnectDialog, PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/connect.json')],
  },
}) {
  init() {
    this.queries.dialog.subscribe('qualify', (entity) => {
      const document = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!document) return;

      const hostDisplay = document.getElementById('host-display') as UIKit.Text;
      const connectBtn = document.getElementById('connect-button') as UIKit.Text;
      const localBtn = document.getElementById('use-local') as UIKit.Text;
      const statusText = document.getElementById('status-text') as UIKit.Text;

      const currentHost = getPtyHost();
      const currentToken = getPtyToken();
      const savedHost = getSavedHost();

      if (currentHost && currentToken) {
        hostDisplay.setProperties({ text: currentHost });
        statusText.setProperties({ text: 'Connecting...' });

        setTimeout(() => {
          entity.object3D!.visible = false;
        }, 2000);
      } else if (currentHost) {
        hostDisplay.setProperties({ text: currentHost });
        statusText.setProperties({ text: 'Need token. Add &token= to URL.' });
      } else if (savedHost) {
        hostDisplay.setProperties({ text: savedHost });
        const hasToken = !!getSavedToken();
        statusText.setProperties({
          text: hasToken ? 'Previous session found. Tap Connect.' : 'Need token. Add &token= to URL.',
        });
      } else {
        hostDisplay.setProperties({ text: 'Add ?pty=host&token=secret to URL' });
      }

      connectBtn.addEventListener('click', () => {
        const host = currentHost || savedHost;
        const token = currentToken || getSavedToken();
        if (host && token) {
          setPtyHost(host, token);
          statusText.setProperties({ text: 'Connecting...' });
          setTimeout(() => {
            entity.object3D!.visible = false;
          }, 1500);
        } else if (!host) {
          statusText.setProperties({ text: 'No host. Use ?pty= in URL.' });
        } else {
          statusText.setProperties({ text: 'No token. Use &token= in URL.' });
        }
      });

      localBtn.addEventListener('click', () => {
        setPtyHost('localhost:3001', 'dev');
        hostDisplay.setProperties({ text: 'localhost:3001' });
        statusText.setProperties({ text: 'Connecting to localhost...' });
        setTimeout(() => {
          entity.object3D!.visible = false;
        }, 1500);
      });
    });
  }
}

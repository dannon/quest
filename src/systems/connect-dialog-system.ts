import {
  createSystem,
  PanelUI,
  PanelDocument,
  eq,
  UIKitDocument,
  UIKit,
} from '@iwsdk/core';
import { ConnectDialog } from '../components/connect-dialog.js';
import { getPtyHost, setPtyHost, getSavedHost } from '../lib/pty-config.js';

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

      // Show saved host or URL param
      const currentHost = getPtyHost();
      const savedHost = getSavedHost();

      if (currentHost) {
        hostDisplay.setProperties({ text: currentHost });
        statusText.setProperties({ text: 'Connecting...' });

        // Auto-hide the dialog if we have a host (already connecting)
        setTimeout(() => {
          entity.object3D!.visible = false;
        }, 2000);
      } else if (savedHost) {
        hostDisplay.setProperties({ text: savedHost });
        statusText.setProperties({ text: 'Previous host found. Tap Connect.' });
      } else {
        hostDisplay.setProperties({ text: 'Add ?pty=your-host to the URL' });
      }

      connectBtn.addEventListener('click', () => {
        const host = currentHost || savedHost;
        if (host) {
          setPtyHost(host);
          statusText.setProperties({ text: 'Connecting...' });
          setTimeout(() => {
            entity.object3D!.visible = false;
          }, 1500);
        } else {
          statusText.setProperties({ text: 'No host set. Use ?pty= in URL.' });
        }
      });

      localBtn.addEventListener('click', () => {
        setPtyHost('localhost:3001');
        hostDisplay.setProperties({ text: 'localhost:3001' });
        statusText.setProperties({ text: 'Connecting to localhost...' });
        setTimeout(() => {
          entity.object3D!.visible = false;
        }, 1500);
      });
    });
  }
}

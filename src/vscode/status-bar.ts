import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import type { AffineUser } from '../client/affine.types';

export class AffineStatusBar {
  private readonly item: vscode.StatusBarItem;

  public constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.renderSignedOut();
    this.item.show();
  }

  public dispose(): void {
    this.item.dispose();
  }

  public renderSignedOut(): void {
    this.item.text = '$(key) AFFiNE: Sign in';
    this.item.tooltip = 'Sign in to AFFiNE Cloud or a self-hosted instance';
    this.item.command = 'affinePanel.focus';
  }

  public renderSignedIn(user: AffineUser): void {
    this.item.text = `$(notebook) AFFiNE: ${user.name}`;
    this.item.tooltip = `Signed in as ${user.name}`;
    this.item.command = 'affinePanel.focus';
  }

  public async refresh(auth: AuthService): Promise<void> {
    try {
      const user = await auth.currentUser();
      if (user === undefined) {
        this.renderSignedOut();
        return;
      }
      this.renderSignedIn(user);
    } catch {
      this.renderSignedOut();
    }
  }
}

import { App, Modal, Setting } from 'obsidian';

/**
 * Modal for entering the OAuth authorization code.
 */
export class AuthCodeModal extends Modal {
	private code: string = '';
	private onSubmit: (code: string | null) => void;

	constructor(app: App, onSubmit: (code: string | null) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('auth-code-modal');

		contentEl.createEl('h2', { text: 'Enter authorization code' });

		contentEl.createEl('p', {
			text: 'After authorizing in your browser, copy the code from the URL ' +
				'(the part after "code=" and before any "&") and paste it below.',
			cls: 'setting-item-description',
		});

		new Setting(contentEl)
			.setName('Authorization code')
			.addText(text => {
				text
					.setPlaceholder('Paste the code here')
					.onChange(value => {
						this.code = value.trim();
					});
				text.inputEl.style.width = '100%';
				text.inputEl.focus();
			});

		new Setting(contentEl)
			.addButton(button => {
				button
					.setButtonText('Cancel')
					.onClick(() => {
						this.onSubmit(null);
						this.close();
					});
			})
			.addButton(button => {
				button
					.setButtonText('Submit')
					.setCta()
					.onClick(() => {
						this.onSubmit(this.code || null);
						this.close();
					});
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

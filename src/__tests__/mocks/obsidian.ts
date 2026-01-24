// Mock Obsidian module for testing
import { vi } from 'vitest';

export class Plugin {
	app: App;
	manifest: PluginManifest;

	loadData(): Promise<unknown> {
		return Promise.resolve({});
	}

	saveData(_data: unknown): Promise<void> {
		return Promise.resolve();
	}

	addCommand(_command: Command): Command {
		return _command;
	}

	addSettingTab(_tab: PluginSettingTab): void {}

	registerEvent(_event: unknown): void {}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement('div');
	}

	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
}

export class PluginSettingTab {
	app: App;
	containerEl: HTMLElement;

	constructor(app: App, _plugin: Plugin) {
		this.app = app;
		this.containerEl = document.createElement('div');
	}

	display(): void {}
	hide(): void {}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {}

	setName(_name: string): this {
		return this;
	}

	setDesc(_desc: string): this {
		return this;
	}

	addText(_cb: (text: TextComponent) => void): this {
		return this;
	}

	addDropdown(_cb: (dropdown: DropdownComponent) => void): this {
		return this;
	}

	addButton(_cb: (button: ButtonComponent) => void): this {
		return this;
	}

	addToggle(_cb: (toggle: ToggleComponent) => void): this {
		return this;
	}
}

export class Notice {
	static lastMessage: string | null = null;
	constructor(message: string, _timeout?: number) {
		Notice.lastMessage = message;
	}
	static clear() {
		Notice.lastMessage = null;
	}
}

// Mock requestUrl for API calls
export const requestUrl = vi.fn();

export class TFile {
	path: string;
	basename: string;
	extension: string;
	name: string;

	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() || '';
		this.extension = this.name.split('.').pop() || '';
		this.basename = this.name.replace(`.${this.extension}`, '');
	}
}

export class TFolder {
	path: string;
	name: string;
	children: (TFile | TFolder)[];

	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() || '';
		this.children = [];
	}
}

// Interfaces
export interface App {
	vault: Vault;
	workspace: Workspace;
	metadataCache: MetadataCache;
}

export interface Vault {
	getAbstractFileByPath(path: string): TFile | TFolder | null;
	read(file: TFile): Promise<string>;
	create(path: string, data: string): Promise<TFile>;
	modify(file: TFile, data: string): Promise<void>;
	getFiles(): TFile[];
}

export interface Workspace {
	on(name: string, callback: (...args: unknown[]) => void): EventRef;
}

export interface MetadataCache {
	getFileCache(file: TFile): CachedMetadata | null;
}

export interface CachedMetadata {
	frontmatter?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventRef {}

export interface PluginManifest {
	id: string;
	name: string;
	version: string;
}

export interface Command {
	id: string;
	name: string;
	callback?: () => void;
}

export interface TextComponent {
	setValue(value: string): this;
	setPlaceholder(placeholder: string): this;
	onChange(callback: (value: string) => void): this;
}

export interface DropdownComponent {
	addOption(value: string, display: string): this;
	setValue(value: string): this;
	onChange(callback: (value: string) => void): this;
}

export interface ButtonComponent {
	setButtonText(text: string): this;
	setCta(): this;
	onClick(callback: () => void): this;
}

export interface ToggleComponent {
	setValue(value: boolean): this;
	onChange(callback: (value: boolean) => void): this;
}

// Helper to create mock App
export function createMockApp(): App {
	return {
		vault: {
			getAbstractFileByPath: () => null,
			read: () => Promise.resolve(''),
			create: () => Promise.resolve(new TFile('')),
			modify: () => Promise.resolve(),
			getFiles: () => [],
		},
		workspace: {
			on: () => ({} as EventRef),
		},
		metadataCache: {
			getFileCache: () => null,
		},
	};
}

import { App, MarkdownView, Modal, normalizePath, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface MeetingNotesPluginSettings {
	meetingNotesFolder: string;
	meetingNoteTemplatePath: string
}

const DEFAULT_SETTINGS: MeetingNotesPluginSettings = {
	meetingNotesFolder: 'Meeting Notes',
	meetingNoteTemplatePath: ''
}

export default class MeetingNotesPlugin extends Plugin {
	settings: MeetingNotesPluginSettings;

	async onload() {
		await this.loadSettings();

		// Add a command to create a new meeting note
		this.addCommand({
			id: 'create-meeting-note',
			name: 'Create meeting note',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				if (!checking) {
					new SampleModal(this.app, this.settings).open();
				}
				return true;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {

	meetingNoteTitle = ""
	settings: MeetingNotesPluginSettings

	constructor(app: App, settings: MeetingNotesPluginSettings) {
		super(app);
		this.settings = settings
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Create meeting note" });

		let date = new Date().toISOString().split('T')[0]

		let resTitle = contentEl.createEl("p", { text: date });

		new Setting(contentEl)
			.setName("Title")
			.addText((text) =>
				text.onChange((value) => {
					this.meetingNoteTitle = value
					resTitle.innerHTML = `${date} - ${value}`
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(async () => {
						this.close();
						

						let templatePath = this.settings.meetingNoteTemplatePath
						
						let template: string;

						if (templatePath !== '') {
							let templateFile = this.app.vault.getAbstractFileByPath(normalizePath(templatePath) + ".md")
							console.log(templatePath)
							if (templateFile instanceof TFile) {
								template = await this.app.vault.read(templateFile)
								template = template.replace("{{date}}", date)
							} else {
								template = ""
							}
						} else {

						template = `---
date: ${date}
---

## Context
*Link relevant projects, technologies, people.*

## Attendees
*Link attendees to the meeting.*

## Outline Notes
*Take outlining notes.*
- 

## Decisions
*Take note of any decisions that were taken during the meeting.*
- 

## Action Items
*Any action items for myself.*
- 
`
}

							const title = `${this.settings.meetingNotesFolder}/${date} - ${this.meetingNoteTitle}`
							this.app.vault.create(normalizePath(`${title}.md`), template).then((res) => {
							
							const view = this.app.workspace.getActiveViewOfType(MarkdownView)

							if (view) {
								view.editor.replaceRange(`[[${title}]]`, view.editor.getCursor())
							}
							
							let leaf = this.app.workspace.getLeaf("split")
							leaf.openFile(res)
							console.log(res)
						}).catch((err) => {
							new Notice(String(err))
						})
					}));
	}


	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MeetingNotesPlugin;

	constructor(app: App, plugin: MeetingNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Meeting Notes' });

		new Setting(containerEl)
			.setName('Meeting Note Folder')
			.setDesc('New meeting notes will be created in this folder')
			.addText(text => text
				.setValue(this.plugin.settings.meetingNotesFolder)
				.onChange(async (value) => {
					this.plugin.settings.meetingNotesFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Meeting Note Template Path')
			.setDesc('Template to be used for new notes')
			.addText(text => text
				.setValue(this.plugin.settings.meetingNoteTemplatePath)
				.onChange(async (value) => {
					this.plugin.settings.meetingNoteTemplatePath = value;
					await this.plugin.saveSettings();
				}));
	}
}

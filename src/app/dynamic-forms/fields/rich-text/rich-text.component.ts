import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from "@angular/core";
import {
  MatDialog,
  MatDialogRef
} from "@angular/material/dialog";

import { faFileCode } from "@fortawesome/free-regular-svg-icons";
import {
  faAlignLeft,
  faBold,
  faCode,
  faHeading,
  faItalic,
  faLink,
  faListOl,
  faListUl,
  faStrikethrough,
  faTasks,
  faUnderline
} from "@fortawesome/free-solid-svg-icons";

import { Editor } from "@tiptap/core";
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from "@tiptap/extension-link";
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

import { lowlight } from 'lowlight/lib/common';

import { TiptapMarkType } from "../../enums/tiptap-mark-type.enum";
import { EventCallback, IEventCallback } from "../../models/cinchy-event-callback.model";
import { ResponseType } from "../../enums/response-type.enum";
import { IFormField } from "../../models/cinchy-form-field.model";
import { isNullOrUndefined } from "util";
import { Transaction } from "prosemirror-state";
import { AddRichTextLinkDialogComponent } from "../../dialogs/add-rich-text-link/add-rich-text-link.component";
import { IRichTextLink } from "../../interface/rich-text-link";


@Component({
  selector: "cinchy-rich-text",
  templateUrl: "./rich-text.component.html",
  styleUrls: ["./rich-text.component.scss"],
})
export class RichTextComponent implements OnDestroy, AfterViewInit {

  @Input() field: IFormField;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;

  @Input() isDisabled: boolean = false;

  @Input() useJson: boolean = true;

  @Output() eventHandler = new EventEmitter<any>();

  /**
   * The element that contains the actual Tiptap editor
   */
  @ViewChild("richTextElement") richTextElement: ElementRef<HTMLDivElement> | undefined;

  editor: Editor | undefined;

  showError: boolean;

  value: any;

  /**
   * Tracks the marks active at the most recent cursor position
   */
  activeMarks = {
    bold: false,
    code: false,
    codeBlock: false,
    Heading1: false,
    Heading2: false,
    Heading3: false,
    Heading4: false,
    Heading5: false,
    italic: false,
    link: false,
    listOrdered: false,
    listUnordered: false,
    listTask: false,
    strike: false,
    underline: false
  };
  // Keyboard shortcut label for ctrl key
  ctrlLabel = window.navigator.appVersion.indexOf("Mac") !== -1 ? "⌘" : "^";

  headings = [
    { name: "Heading 1", title: `${this.ctrlLabel} + Alt + 1`, value: "Heading1"},
    { name: "Heading 2", title: `${this.ctrlLabel} + Alt + 2`, value: "Heading2"},
    { name: "Heading 3", title: `${this.ctrlLabel} + Alt + 3`, value: "Heading3"},
    { name: "Heading 4", title: `${this.ctrlLabel} + Alt + 4`, value: "Heading4"},
    { name: "Heading 5", title: `${this.ctrlLabel} + Alt + 5`, value: "Heading5"},
  ]

  icons = {
    faAlignLeft: faAlignLeft,
    faBold: faBold,
    faCode: faCode,
    faFileCode: faFileCode,
    faHeading: faHeading,
    faItalic: faItalic,
    faLink: faLink,
    faListOl: faListOl,
    faListUl: faListUl,
    faStrikethrough: faStrikethrough,
    faTasks: faTasks,
    faUnderline: faUnderline
  };

  tiptapMarkType = TiptapMarkType;


  /**
   * Determines whether or not the form is in a savable state
   */
  get canEdit(): boolean {

    return (!this.field.cinchyColumn.isViewOnly && !this.isDisabled && this.field.cinchyColumn.canEdit);
  }


  constructor(
    private _dialog: MatDialog,
  ) {}


  ngAfterViewInit(): void {

    let content: string | Object;

    try {
      content = ((this.field.value as string).includes(`"type":"doc"`)) ? JSON.parse(this.field.value ?? "{}") : this.field.value;
    }
    catch (error) {
      content = this.field.value;
    }
    
    if (this.canEdit) {
      // Disable spellcheck in code blocks
      const CustomCodeBlockLowlight = CodeBlockLowlight.extend({
        addAttributes() {
          return {
            spellcheck: { default: 'false' },
          }
        }
      });

      this.editor = new Editor({
        element: this.richTextElement?.nativeElement,
        extensions: [
          CustomCodeBlockLowlight.configure({
            lowlight,
          }),
          Link.extend({
            inclusive: false
          }),
          StarterKit.configure({
            heading: { levels: [1, 2, 3, 4, 5] },
          }),
          TaskList,
          TaskItem,
          Underline,
        ],
        content: content,
        editable: true,
        onBlur: (event: any): void => {

          this.onBlur(event);
        },
        /**
         * Update the state of the marks at the cursor position
         */
        onTransaction: (args: { editor: Editor, transaction: Transaction }): void => {

          this.activeMarks.bold = this.editor?.isActive("bold");
          this.activeMarks.code = this.editor?.isActive("code");
          this.activeMarks.codeBlock = this.editor?.isActive("codeBlock");
          this.activeMarks.Heading1 = this.editor?.isActive("heading", { level: 1 });
          this.activeMarks.Heading2 = this.editor?.isActive("heading", { level: 2 });
          this.activeMarks.Heading3 = this.editor?.isActive("heading", { level: 3 });
          this.activeMarks.Heading4 = this.editor?.isActive("heading", { level: 4 });
          this.activeMarks.Heading5 = this.editor?.isActive("heading", { level: 5 });
          this.activeMarks.italic = this.editor?.isActive("italic");
          this.activeMarks.link = this.editor?.isActive("link");
          this.activeMarks.listOrdered = this.editor?.isActive("orderedList");
          this.activeMarks.listUnordered = this.editor?.isActive("bulletList");
          this.activeMarks.listTask = this.editor?.isActive("taskList");
          this.activeMarks.strike = this.editor?.isActive("strike");
          this.activeMarks.underline = this.editor?.isActive("underline");
        },
        onUpdate: (): void => {

          this._resolveValue();
        }
      });
    }
  }


  ngOnDestroy(): void {

    this.editor?.destroy();
  }


  onBlur(event: any) {

    this._resolveValue();

    this._callbackEvent(this.targetTableName, this.field.cinchyColumn.name, event, "value");
  }


  /**
   * Refocuses the field's editable portion
   */
  setFocus(): void {

    this.editor?.chain().focus();
  }


  /**
   * Adds or removes the given mark at the current cursor position
   */
  toggleMark(type: TiptapMarkType): void {

    switch (type) {
      case TiptapMarkType.Bold:
        this.editor?.commands.toggleBold();

        break;
      case TiptapMarkType.Code:
        this.editor?.commands.toggleCode();

        break;
      case TiptapMarkType.CodeBlock:
        this.editor?.commands.toggleCodeBlock();

        break;
      case TiptapMarkType.Paragraph:
        this.editor?.commands.setParagraph();
        break;
      case TiptapMarkType.Heading1:
        this.editor?.commands.toggleHeading({ level: 1});

        break;
      case TiptapMarkType.Heading2:
        this.editor?.commands.toggleHeading({ level: 2 });

        break;
      case TiptapMarkType.Heading3:
        this.editor?.commands.toggleHeading({ level: 3 });

        break;
      case TiptapMarkType.Heading4:
        this.editor?.commands.toggleHeading({ level: 4 });

        break;
      case TiptapMarkType.Heading5:
        this.editor?.commands.toggleHeading({ level: 5 });

        break;
      case TiptapMarkType.Heading6:
        this.editor?.commands.toggleHeading({ level: 6 });

        break;
      case TiptapMarkType.Italic:
        this.editor?.commands.toggleItalic();

        break;
      case TiptapMarkType.ListOrdered:
        this.editor?.commands.toggleOrderedList();

        break;
      case TiptapMarkType.ListUnordered:
        this.editor?.commands.toggleBulletList();

        break;
      case TiptapMarkType.ListTask:
        this.editor?.commands.toggleTaskList();

        break;
      case TiptapMarkType.Strike:
        this.editor?.commands.toggleStrike();

        break;
      case TiptapMarkType.Underline:
        this.editor?.commands.toggleUnderline();

        break;
      default:
        console.warn("Unsupported mark attempted:", type);
    }

    this.setFocus();
  }


  /**
   * Inserts an anchor element at the most recent cursor position
   */
  toggleLink(): void {

    if (this.activeMarks.link) {
      this.editor?.commands.unsetLink();
    }
    else {
      const selection = this.editor.view.state.selection;
      const selectedText = selection ? this.editor.state.doc.textBetween(selection.from, selection.to) : undefined;

      const dialogRef: MatDialogRef<AddRichTextLinkDialogComponent> = this._dialog.open(
        AddRichTextLinkDialogComponent,
        {
          data: {
            content: selectedText
          },
          maxHeight: "80vh",
          width: "600px"
        }
      );

      dialogRef.afterClosed().subscribe({
        next: (result: IRichTextLink) => {

          if (result) {
            this.editor
              .chain()
              .deleteSelection()
              .setLink({
                href: result.href,
                target: (result.targetBlank ? "_blank" : "")
              })
              .insertContent(result.content)
              .focus()
              .run();
          }
        }
      })
    }
  }


  private _callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {

    this.field.cinchyColumn.hasChanged = true;

    const Data = {
      TableName: targetTableName,
      ColumnName: columnName,
      Value: this.value,
      event: event,
      HasChanged: this.field.cinchyColumn.hasChanged,
      Form: this.field.form,
      Field: this.field
    }

    this.field.value = this.value;

    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }


  private _resolveValue(): void {

    this.value = this.useJson ? JSON.stringify(this.editor?.getJSON()) : this.editor?.getHTML();
  }
}

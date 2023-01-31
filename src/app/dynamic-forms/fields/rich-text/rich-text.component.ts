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
  faUnderline,
  faImage,
  faTable,
  faTrash,
  faLevelDownAlt,
  faLevelUpAlt,
  faMinusSquare
} from "@fortawesome/free-solid-svg-icons";

import { Editor } from "@tiptap/core"

import { Transaction } from "prosemirror-state";

import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"

import { AddRichTextLinkDialogComponent } from "../../dialogs/add-rich-text-link/add-rich-text-link.component";
import { AddRichTextImageComponent } from "../../dialogs/add-rich-text-image/add-rich-text-image.component";

import { ResponseType } from "../../enums/response-type.enum";
import { TiptapMarkType } from "../../enums/tiptap-mark-type.enum";

import { IRichTextImage } from "../../interface/rich-text-image";
import { IRichTextLink } from "../../interface/rich-text-link";

import { EventCallback, IEventCallback } from "../../models/cinchy-event-callback.model";
import { IFormField } from "../../models/cinchy-form-field.model";


@Component({
  selector: "cinchy-rich-text",
  templateUrl: "./rich-text.component.html",
  styleUrls: ["./rich-text.component.scss"],
})
export class RichTextComponent implements AfterViewInit, OnDestroy {

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
    heading1: false,
    heading2: false,
    heading3: false,
    heading4: false,
    heading5: false,
    image: false,
    italic: false,
    link: false,
    listOrdered: false,
    listUnordered: false,
    strike: false,
    table: false,
    underline: false
  };

  icons = {
    faAlignLeft: faAlignLeft,
    faBold: faBold,
    faCode: faCode,
    faHeading: faHeading,
    faImage: faImage,
    faItalic: faItalic,
    faLevelDownAlt: faLevelDownAlt,
    faLevelUpAlt: faLevelUpAlt,
    faLink: faLink,
    faListOl: faListOl,
    faListUl: faListUl,
    faMinusSquare: faMinusSquare,
    faStrikethrough: faStrikethrough,
    faTable: faTable,
    faTrash: faTrash,
    faUnderline: faUnderline
  };

  tiptapMarkType = TiptapMarkType;


  private _DEFAULT_TABLE_COLUMN_COUNT = 3;

  private _DEFAULT_TABLE_ROW_COUNT = 3;
  

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
      this.editor = new Editor({
        element: this.richTextElement?.nativeElement,
        extensions: [
          StarterKit,
          Link.extend({
            inclusive: false
          }),
          Underline,
          Image,
          Table.configure({
            resizable: true,
          }),
          TableRow,
          TableHeader,
          TableCell
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

          this.activeMarks.bold = args.editor.isActive("bold");
          this.activeMarks.code = args.editor.isActive("code");
          this.activeMarks.heading1 = args.editor.isActive("heading", { level: 1 });
          this.activeMarks.heading2 = args.editor.isActive("heading", { level: 2 });
          this.activeMarks.heading3 = args.editor.isActive("heading", { level: 3 });
          this.activeMarks.heading4 = args.editor.isActive("heading", { level: 4 });
          this.activeMarks.heading5 = args.editor.isActive("heading", { level: 5 });
          this.activeMarks.italic = args.editor.isActive("italic");
          this.activeMarks.link = args.editor.isActive("link");
          this.activeMarks.listOrdered = args.editor.isActive("orderedList");
          this.activeMarks.listUnordered = args.editor.isActive("bulletList");
          this.activeMarks.strike = args.editor.isActive("strike");
          this.activeMarks.underline = args.editor.isActive("underline");
          this.activeMarks.image = args.editor.isActive("image");
          this.activeMarks.table = args.editor.isActive("table");
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


  /**
   * Deletes the focused column
   */
  deleteColumn(): void {

    if (this.activeMarks.table) {
      this.editor.chain().focus().deleteColumn().run();
    }
  }


  /**
   * Deletes the focused row
   */
  deleteRow(): void {

    if (this.activeMarks.table) {
      this.editor.chain().focus().deleteRow().run();
    }
  }


  /**
   * Deletes the focused table
   */
  deleteTable(): void {

    if (this.activeMarks.table) {
      this.editor.chain().focus().deleteTable().run();
    }
  }


  /**
   * Inserts a column after the focused column of the focused table
   */
  insertColumnAfter(): void {

    if (this.activeMarks.table) {
      this.editor.chain().focus().addColumnAfter().run();
    }
  }


  /**
   * Inserts a column before the focused column of the focused table
   */
  insertColumnBefore(): void {

    if (this.activeMarks.table) {
      this.editor.chain().focus().addColumnBefore().run();
    }
  }


  /**
   * Inserts an image tag at the given position with a source provided by the user
   */
  insertImage(): void {

    let currentSrc: string;


    if (this.activeMarks.image) {
      currentSrc = this.editor?.getAttributes("image").src;
    }
    else {
      const selection = this.editor.view.state.selection;
      currentSrc = selection ? this.editor.state.doc.textBetween(selection.from, selection.to) : undefined;
    }

    const dialogRef: MatDialogRef<AddRichTextImageComponent> = this._dialog.open(
      AddRichTextImageComponent,
      {
        data: {
          href: currentSrc ?? undefined
        },
        maxHeight: "80vh",
        width: "600px"
      }
    );

    dialogRef.afterClosed().subscribe({
      next: (result: IRichTextImage) => {

        if (result) {
          this.editor
            .chain()
            .setImage({ src: result.src })
            .focus()
            .run();
        }
      }
    });
  }


  /**
   * Inserts a row after the focused row of the focused table
   */
  insertRowAfter(): void {

    if (this.activeMarks.table) {
      this.editor.chain().focus().addRowAfter().run();
    }
  }


  /**
   * Inserts a row before the focused row of the focused table
   */
  insertRowBefore(): void {

    if (this.activeMarks.table) {
      this.editor.chain().focus().addRowBefore().run();
    }
  }


  /**
   * Inserts a table at the cursor position
   */
  insertTable(): void {

    this.editor
      .chain()
      .focus()
      .insertTable({
        rows: this._DEFAULT_TABLE_COLUMN_COUNT,
        cols: this._DEFAULT_TABLE_ROW_COUNT,
        withHeaderRow: true
      })
      .run();
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
              ?.chain()
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

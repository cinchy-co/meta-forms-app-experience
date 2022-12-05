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
  faBold,
  faCode,
  faHeading,
  faItalic,
  faListOl,
  faListUl,
  faParagraph,
  faStrikethrough,
  faUnderline
} from "@fortawesome/free-solid-svg-icons";

import { Editor } from "@tiptap/core"

import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline";

import { TiptapMarkType } from "../../enums/tiptap-mark-type.enum";
import { EventCallback, IEventCallback } from "../../models/cinchy-event-callback.model";
import { ResponseType } from "../../enums/response-type.enum";
import { IFormField } from "../../models/cinchy-form-field.model";


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

  @Input() useJson: boolean = false;

  @Output() eventHandler = new EventEmitter<any>();

  @ViewChild("richTextElement") richTextElement: ElementRef<HTMLDivElement> | undefined;

  editor: Editor | undefined;

  showError: boolean;

  value: any;

  icons = {
    faBold: faBold,
    faCode: faCode,
    faHeading: faHeading,
    faItalic: faItalic,
    faListOl: faListOl,
    faListUl: faListUl,
    faParagraph: faParagraph,
    faStrikethrough: faStrikethrough,
    faUnderline: faUnderline
  };

  tiptapMarkType = TiptapMarkType;


  get canEdit(): boolean {

    return (!this.field.cinchyColumn.isViewOnly && !this.isDisabled && this.field.cinchyColumn.canEdit);
  }


  constructor() {}


  ngAfterViewInit(): void {

    if (this.canEdit) {
      this.editor = new Editor({
        element: this.richTextElement?.nativeElement,
        extensions: [
          StarterKit,
          Link,
          Underline
        ],
        content: this.useJson ? JSON.parse(this.field.value ?? "{}") : this.field.value,
        editable: true,
        onBlur: (event: any): void => {

          this.onBlur(event);
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
   * Turns on or off bold text at the cursor location or for the selection
   */
  toggleLink(text: string): void {

    this.editor?.commands.toggleLink({ href: text, target: "_blank" });
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

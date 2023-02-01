export enum TiptapMarkType {
  /**
   * Represents a <b> tag.
   *
   * Hotkey: mod + b
   */
  Bold = "BOLD",
  /**
   * Represents a <code> tag.
   *
   * Hotkey: `{text}`
   */
  Code = "CODE",
  /**
   * Default extension, required for Tiptap. The wrapping element.
   */
  Document = "DOCUMENT",
  /**
   * Represents a <br /> tag
   *
   * Hotkey: mod/shift + enter
   */
  HardBreak = "HARD_BREAK",
  /**
   * Represents an <h1> tag.
   *
   * Hotkey: # || mod + alt + 1
   */
  Heading1 = "HEADING_1",
  /**
   * Represents an <h2> tag.
   *
   * Hotkey: ## || mod + alt + 2
   */
  Heading2 = "HEADING_2",
  /**
   * Represents an <h3> tag.
   *
   * Hotkey: ### || mod + alt + 3
   */
  Heading3 = "HEADING_3",
  /**
   * Represents an <h4> tag.
   *
   * Hotkey: ####  || mod + alt + 4
   */
  Heading4 = "HEADING_4",
  /**
   * Represents an <h5> tag.
   *
   * Hotkey: ##### || mod + alt + 5
   */
  Heading5 = "HEADING_5",
  /**
   * Represents an <h6> tag.
   *
   * Hotkey: ###### || mod + alt + 6
   */
  Heading6 = "HEADING_6",
   /**
   * Represents an Image tag.
   */
  Image = "IMAGE",
  /**
   * Represents an <i> tag.
   *
   * Hotkey: mod + i
   */
  Italic = "ITALIC",
  /**
   * Generates an <a> element with its href set to the selected text. Will auto-link if the typed text is determined to be a URL
   */
  Link = "LINK",
  /**
   * Automatically adds list items when inside a ListOrdered or ListUnordered
   */
  ListItem = "LIST_ITEM",
  /**
   * Represents an <ol> tag
   *
   * Hotkey: 1. at the beginning of a new line
   */
  ListOrdered = "ORDERED_LIST",
  /**
   * Represents a <ul> tag
   *
   * Hotkey: +/-/* at the beginning of a new line
   */
  ListUnordered = "BULLET_LIST",
  /**
   * Automatically inserts a <p> tag when doing a soft line breat
   */
  Paragraph = "PARAGRAPH",
  /**
   * Represents an <s> tag.
   *
   * Hotkey: ~~{text}~~
   */
  Strike = "STRIKE",
  /**
   * Represents a Table tag with all table operations like Add Before/After row , Add Before/After column, Delete table, column, row.
   */
  Table = "TABLE",
  /**
   * Default extension, required for TipTap. Enables plaintext in the field.
   */
  Text = "TEXT",
  /**
   * Represents a <u> tag
   *
   * Hotkey: mod + u
   */
  Underline = "UNDERLINE"
}

"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Image from "@tiptap/extension-image"
import Mathematics from "@tiptap/extension-mathematics"
import TextAlign from "@tiptap/extension-text-align"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableCell } from "@tiptap/extension-table-cell"
import { Extension } from "@tiptap/core"
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  Heading1, Heading2, Heading3, 
  Image as ImageIcon, Sigma,
  AlignLeft, AlignCenter, AlignRight,
  Table as TableIcon, Plus, Trash2,
  List, ListOrdered, Outdent, Indent,
  Undo2, Redo2
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Deklarasi Type tambahan untuk Tiptap
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customIndent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

// Custom Extension Indent
const CustomIndent = Extension.create({
  name: "customIndent",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
      indentLevels: [0, 24, 48, 72, 96],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const paddingLeft = element.style.paddingLeft
              return paddingLeft ? parseInt(paddingLeft, 10) : 0
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) {
                return {}
              }
              return {
                style: `padding-left: ${attributes.indent}px`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { $from } = selection
          const node = $from.node($from.depth)
          const currentIndent = node.attrs.indent || 0
          const nextIndent = this.options.indentLevels.find((level: number) => level > currentIndent)

          if (nextIndent !== undefined && dispatch) {
            tr.setNodeAttribute($from.before($from.depth), "indent", nextIndent)
            return true
          }
          return false
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { $from } = selection
          const node = $from.node($from.depth)
          const currentIndent = node.attrs.indent || 0
          const prevIndent = [...this.options.indentLevels]
            .reverse()
            .find((level: number) => level < currentIndent)

          if (prevIndent !== undefined && dispatch) {
            tr.setNodeAttribute($from.before($from.depth), "indent", prevIndent)
            return true
          }
          return false
        },
    }
  },
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Image,
      Mathematics,
      CustomIndent,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onSelectionUpdate: () => {
      forceUpdate()
    },
  })

  if (!editor) {
    return null
  }

  const addImage = () => {
    const url = window.prompt("Masukkan URL Gambar:")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addMath = () => {
    const formula = window.prompt("Masukkan Rumus LaTeX (contoh: \\frac{a}{b}):")
    if (formula) {
      editor.chain().focus().insertContent(`$${formula}$`).run()
    }
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const isTableActive = editor.isActive("table")

  return (
    <div className="border border-input rounded-md bg-background overflow-hidden shadow-sm flex flex-col">
      {/* Toolbar - Dibuat sebaris rapat (flex-nowrap & overflow-x-auto) */}
      <div 
        className="flex flex-nowrap items-center gap-0.5 p-1 border-b bg-muted/40 shrink-0 select-none overflow-x-auto scrollbar-none"
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Undo & Redo */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().undo().run()
          }}
          disabled={!editor.can().undo()}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().redo().run()
          }}
          disabled={!editor.can().redo()}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-[1px] h-4 bg-border mx-0.5 shrink-0" />

        {/* Formatting */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bold") ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().toggleBold().run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("italic") ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().toggleItalic().run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("underline") ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().toggleUnderline().run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Button>

        <div className="w-[1px] h-4 bg-border mx-0.5 shrink-0" />

        {/* List & Indentation */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().toggleBulletList().run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().toggleOrderedList().run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        {/* Outdent */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
              editor.chain().focus().liftListItem("listItem").run()
            } else {
              editor.chain().focus().outdent().run()
            }
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Outdent"
        >
          <Outdent className="h-3.5 w-3.5" />
        </Button>

        {/* Indent */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
              editor.chain().focus().sinkListItem("listItem").run()
            } else {
              editor.chain().focus().indent().run()
            }
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Indent"
        >
          <Indent className="h-3.5 w-3.5" />
        </Button>

        <div className="w-[1px] h-4 bg-border mx-0.5 shrink-0" />

        {/* Alignment */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().setTextAlign("left").run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Rata Kiri"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().setTextAlign("center").run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Rata Tengah"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().setTextAlign("right").run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Rata Kanan"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>

        <div className="w-[1px] h-4 bg-border mx-0.5 shrink-0" />

        {/* Headings */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-[1px] h-4 bg-border mx-0.5 shrink-0" />

        {/* Insert Options */}
        <Button
          type="button"
          size="sm"
          variant={isTableActive ? "default" : "ghost"}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            addTable()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Buat Tabel (3x3)"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            addImage()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Upload / Insert Gambar"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            addMath()
          }}
          className="h-8.5 w-8.5 p-0 shrink-0"
          title="Masukkan Rumus LaTeX"
        >
          <Sigma className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Area Teks & Editor */}
      <div 
        className="p-3 bg-background m-2 rounded-md border border-input transition-all flex flex-col focus-within:border-ring focus-within:ring-1 focus-within:ring-ring cursor-text"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent 
          editor={editor} 
          className="
            w-full min-h-[100px] prose prose-sm max-w-none
            [&_p]:m-0
            [&_h1]:text-2xl [&_h1]:font-bold
            [&_h2]:text-xl [&_h2]:font-bold
            [&_h3]:text-lg [&_h3]:font-semibold
            focus:outline-none
            [&_.ProseMirror]:outline-none
            [&_.ProseMirror-selectednode]:outline-none

            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1

            [&_.tableWrapper]:overflow-x-auto
            [&_.tableWrapper]:max-w-full

            [&_table]:border-separate
            [&_table]:border-spacing-0
            [&_table]:overflow-hidden
            [&_table]:w-full
            [&_table]:my-2
            [&_table]:table-fixed

            [&_td,&_th]:border-b [&_td,&_th]:border-r [&_td,&_th]:border-border
            [&_table]:border [&_table]:border-border
            [&_td,&_th]:p-2.5
            [&_td,&_th]:relative
            [&_td,&_th]:align-top
            [&_td,&_th]:box-border
            [&_td,&_th]:min-w-[1em]
            [&_td,&_th]:h-auto
            [&_th]:bg-muted/60

            [&_.column-resize-handle]:absolute
            [&_.column-resize-handle]:right-[-2px]
            [&_.column-resize-handle]:top-0
            [&_.column-resize-handle]:bottom-[-2px]
            [&_.column-resize-handle]:w-[6px]
            [&_.column-resize-handle]:bg-transparent
            [&_.column-resize-handle]:cursor-col-resize
            [&_.column-resize-handle]:z-10

            [&_.selectedCell]:bg-accent/40
          "
        />

        {/* Action Bar Tabel */}
        {isTableActive && (
          <div 
            className="mt-2 pt-2 border-t border-dashed border-border flex flex-wrap items-center justify-between gap-2 shrink-0 select-none"
            onMouseDown={(e) => e.preventDefault()}
          >
            {/* Tambah Baris & Kolom */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  editor.chain().focus().addRowAfter().run()
                }}
                className="h-7 text-xs gap-1 border-dashed"
              >
                <Plus className="h-3 w-3" /> Baris
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  editor.chain().focus().addColumnAfter().run()
                }}
                className="h-7 text-xs gap-1 border-dashed"
              >
                <Plus className="h-3 w-3" /> Kolom
              </Button>
            </div>

            {/* Hapus Baris, Kolom, & Tabel */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  editor.chain().focus().deleteRow().run()
                }}
                className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                title="Hapus baris tempat kursor berada"
              >
                <Trash2 className="h-3 w-3" /> Hapus Baris
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  editor.chain().focus().deleteColumn().run()
                }}
                className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                title="Hapus kolom tempat kursor berada"
              >
                <Trash2 className="h-3 w-3" /> Hapus Kolom
              </Button>

              <div className="w-[1px] h-4 bg-border mx-0.5" />

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  editor.chain().focus().deleteTable().run()
                }}
                className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                title="Hapus seluruh tabel"
              >
                <Trash2 className="h-3 w-3" /> Hapus Tabel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
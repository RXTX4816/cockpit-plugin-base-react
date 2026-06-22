import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, type Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { unifiedMergeView } from "@codemirror/merge";
import { useDarkMode } from "../hooks/useDarkMode";
import "./CodeEditor.css";

export interface DiffEditorProps {
  original: string;
  modified: string;
  extensions?: Extension[];
  className?: string;
}

export function DiffEditor({
  original,
  modified,
  extensions = [],
  className,
}: DiffEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const modifiedRef = useRef(modified);
  const isDark = useDarkMode();

  useEffect(() => {
    modifiedRef.current = modified;
  }, [modified]);

  useEffect(() => {
    if (!containerRef.current) return;

    const allExtensions: Extension[] = [
      basicSetup,
      ...extensions,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      unifiedMergeView({ original, mergeControls: false }),
    ];

    if (isDark) allExtensions.push(oneDark);

    const state = EditorState.create({ doc: modifiedRef.current, extensions: allExtensions });
    const editor = new EditorView({ state, parent: containerRef.current });
    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  // original triggers a full recreate when the baseline changes.
  // isDark triggers a recreate so the theme extension is applied/removed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, original, ...extensions]);

  // Sync externally-driven modified content without recreating the editor.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.state.doc.toString() !== modified) {
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: modified },
      });
    }
  }, [modified]);

  return <div ref={containerRef} className={`ce-editor${className ? ` ${className}` : ""}`} />;
}

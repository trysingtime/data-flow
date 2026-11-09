import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";

export type EditorChangeHandler = (value: string) => void;

export class EditorController {
  private readonly view: EditorView;

  constructor(
    host: HTMLElement,
    initialValue: string,
    onChange: EditorChangeHandler,
  ) {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: initialValue,
      extensions: [basicSetup, updateListener],
    });

    this.view = new EditorView({
      state,
      parent: host,
    });
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  setValue(value: string): void {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: value },
    });
  }

  refresh(): void {
    this.view.requestMeasure();
  }
}

// CKEditor 5 integration for Zendesk, Medium, and other CKE5-based sites

export class CKEditorHandler {
  // Detect if element is a CKEditor 5 instance
  static detect(element: HTMLElement): boolean {
    // Check for CKEditor 5 class
    if (element.classList.contains('ck-editor__editable')) {
      return true;
    }

    // Check for ckeditorInstance property
    if ((element as any).ckeditorInstance) {
      return true;
    }

    // Check if parent has CKEditor container
    let parent = element.parentElement;
    while (parent) {
      if (parent.classList.contains('ck-editor') || parent.classList.contains('ck')) {
        return true;
      }
      parent = parent.parentElement;
    }

    return false;
  }

  // Replace text in CKEditor using model API
  static async replace(
    element: HTMLElement,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      console.log('TextBlitz: CKEditor5 handler attempting replacement');

      // Find the editable element
      let editableElement = element;
      if (!editableElement.classList.contains('ck-editor__editable')) {
        editableElement = element.querySelector('.ck-editor__editable') as HTMLElement;
        if (!editableElement) {
          editableElement = element.closest('.ck-editor__editable') as HTMLElement;
        }
      }

      if (!editableElement) {
        console.warn('TextBlitz: Could not find CKEditor editable element');
        return false;
      }

      // Try to get editor instance
      const editorInstance = (editableElement as any).ckeditorInstance;
      if (!editorInstance) {
        console.warn('TextBlitz: CKEditor instance not found on element');

        // Fallback: try to inject script in MAIN world
        return await this.replaceViaMainWorld(editableElement, trigger, expansion);
      }

      // Use CKEditor model API
      return await this.replaceViaModel(editorInstance, trigger, expansion);
    } catch (error) {
      console.error('TextBlitz: CKEditor handler error:', error);
      return false;
    }
  }

  // Replace using CKEditor model API (when instance is available)
  private static async replaceViaModel(
    editor: any,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      const model = editor.model;
      const selection = model.document.selection;

      model.change((writer: any) => {
        // Get current position
        const position = selection.getFirstPosition();

        // Get text before cursor
        const range = model.createRange(
          model.createPositionAt(position.root, 0),
          position
        );

        let textBefore = '';
        for (const item of range.getItems()) {
          if (item.is('$textProxy')) {
            textBefore += item.data;
          }
        }

        // Check if trigger is at the end
        if (!textBefore.endsWith(trigger)) {
          console.warn('TextBlitz: Trigger not found at cursor position');
          return false;
        }

        // Calculate trigger start position
        const triggerLength = trigger.length;
        const deletePosition = model.createPositionAt(
          position.root,
          position.offset - triggerLength
        );

        // Delete trigger
        const deleteRange = model.createRange(deletePosition, position);
        writer.remove(deleteRange);

        // Insert expansion
        writer.insertText(expansion, deletePosition);

        // Move cursor to end of expansion
        const newPosition = model.createPositionAt(
          position.root,
          deletePosition.offset + expansion.length
        );
        writer.setSelection(newPosition);
      });

      console.log('TextBlitz: ✅ CKEditor model replacement succeeded');
      return true;
    } catch (error) {
      console.error('TextBlitz: CKEditor model replacement failed:', error);
      return false;
    }
  }

  // Fallback: inject script into MAIN world to access editor
  private static async replaceViaMainWorld(
    element: HTMLElement,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      // Mark element with unique ID for targeting
      const targetId = `textblitz-target-${Date.now()}`;
      element.setAttribute('data-textblitz-target', targetId);

      // Inject script into MAIN world
      const result = await chrome.runtime.sendMessage({
        type: 'INJECT_CKEDITOR_SCRIPT',
        targetId,
        trigger,
        expansion
      });

      // Clean up
      element.removeAttribute('data-textblitz-target');

      return result?.success || false;
    } catch (error) {
      console.error('TextBlitz: MAIN world injection failed:', error);
      return false;
    }
  }
}

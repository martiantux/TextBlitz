// Site-specific detection for special handling
export class SiteDetector {
  static isGoogleDocs(element?: HTMLElement): boolean {
    // Check hostname
    if (window.location.hostname.includes('docs.google.com')) {
      return true;
    }

    // Check for Google Docs-specific classes
    if (element) {
      if (element.classList.contains('kix-cursor') ||
          element.closest('.kix-appview-editor') ||
          document.querySelector('.kix-appview-editor')) {
        return true;
      }
    }

    return false;
  }

  static isReact(element: HTMLElement): boolean {
    // Check for React fiber keys
    const keys = Object.keys(element);
    return keys.some(key =>
      key.startsWith('__react') ||
      key.startsWith('_react') ||
      key.startsWith('__REACT')
    );
  }

  static isVue(element: HTMLElement): boolean {
    // Check for Vue instance keys
    return '__vue__' in element ||
           '__vueParentComponent' in element ||
           '__v_skip' in element;
  }

  static isShadowDOM(element: HTMLElement): boolean {
    return !!element.shadowRoot || !!element.closest('[shadowroot]');
  }

  static isCustomEditor(element: HTMLElement): boolean {
    // CodeMirror, Monaco, Lexical, etc.
    return element.classList.contains('CodeMirror') ||
           element.classList.contains('monaco-editor') ||
           element.getAttribute('data-lexical-editor') !== null ||
           element.classList.contains('ProseMirror');
  }

  static getSiteType(element: HTMLElement): SiteType {
    if (this.isGoogleDocs(element)) return 'google-docs';
    if (this.isCustomEditor(element)) return 'custom-editor';
    if (this.isReact(element)) return 'react';
    if (this.isVue(element)) return 'vue';
    if (this.isShadowDOM(element)) return 'shadow-dom';
    return 'standard';
  }
}

export type SiteType = 'google-docs' | 'react' | 'vue' | 'shadow-dom' | 'custom-editor' | 'standard';

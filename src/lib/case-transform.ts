// Case transformation utilities
import type { CaseTransform } from './types';

export class CaseTransformer {
  // Detect the case pattern of text
  static detectCase(text: string): 'upper' | 'lower' | 'title' | 'capitalize' | 'mixed' {
    if (!text) return 'lower';

    const hasLower = /[a-z]/.test(text);
    const hasUpper = /[A-Z]/.test(text);

    if (!hasLower && !hasUpper) return 'lower';
    if (!hasLower && hasUpper) return 'upper';
    if (hasLower && !hasUpper) return 'lower';

    // Check if first char is upper (capitalize or title)
    if (/^[A-Z]/.test(text)) {
      // Title case: Most words start with uppercase
      const words = text.split(/\s+/);
      const titleWords = words.filter(w => /^[A-Z]/.test(w));
      if (titleWords.length > 1 || (words.length > 1 && titleWords.length === words.length)) {
        return 'title';
      }
      return 'capitalize';
    }

    return 'mixed';
  }

  // Apply case transformation to text
  static transform(text: string, mode: CaseTransform, triggerText?: string): string {
    switch (mode) {
      case 'upper':
        return text.toUpperCase();

      case 'lower':
        return text.toLowerCase();

      case 'title':
        return this.toTitleCase(text);

      case 'capitalize':
        return this.capitalize(text);

      case 'match':
        if (!triggerText) return text;
        return this.matchCase(text, triggerText);

      case 'none':
      default:
        return text;
    }
  }

  // Convert to Title Case (first letter of each word uppercase)
  private static toTitleCase(text: string): string {
    return text
      .split(/(\s+)/)
      .map(word => {
        if (/^\s+$/.test(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  // Capitalize first letter only
  private static capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  // Match the case pattern of source text
  private static matchCase(text: string, source: string): string {
    const sourceCase = this.detectCase(source);

    switch (sourceCase) {
      case 'upper':
        return text.toUpperCase();
      case 'lower':
        return text.toLowerCase();
      case 'title':
        return this.toTitleCase(text);
      case 'capitalize':
        return this.capitalize(text);
      default:
        return text;
    }
  }
}

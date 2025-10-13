// Form popup UI for collecting user input during snippet expansion

import type { FormField, FormData } from './types';

export class FormPopup {
  private overlay: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private onSubmit: ((data: FormData) => void) | null = null;
  private onCancel: (() => void) | null = null;

  // Show form popup with fields
  show(fields: FormField[], onSubmit: (data: FormData) => void, onCancel: () => void): void {
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal
    this.modal = document.createElement('div');
    this.modal.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Build form
    this.modal.innerHTML = `
      <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
          Complete Snippet
        </h2>
        <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">
          Fill in the fields below to insert your snippet
        </p>
      </div>
      <form id="textblitz-form" style="padding: 20px;">
        ${fields.map(field => this.renderField(field)).join('')}
      </form>
      <div style="padding: 16px 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end;">
        <button
          type="button"
          id="textblitz-form-cancel"
          style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 6px; background: white; color: #374151; font-size: 14px; font-weight: 500; cursor: pointer;"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="textblitz-form"
          style="padding: 8px 16px; border: none; border-radius: 6px; background: #6366f1; color: white; font-size: 14px; font-weight: 500; cursor: pointer;"
        >
          Insert
        </button>
      </div>
    `;

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    // Setup event listeners
    const form = this.modal.querySelector('#textblitz-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(fields);
    });

    const cancelBtn = this.modal.querySelector('#textblitz-form-cancel');
    cancelBtn?.addEventListener('click', () => this.handleCancel());

    // Close on escape
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.handleCancel();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Focus first input
    const firstInput = this.modal.querySelector('input, textarea, select') as HTMLElement;
    firstInput?.focus();
  }

  // Render a form field
  private renderField(field: FormField): string {
    const { type, name, label, options, defaultValue, required } = field;

    let input = '';
    const requiredAttr = required ? 'required' : '';
    const requiredLabel = required ? '<span style="color: #ef4444;">*</span>' : '';

    switch (type) {
      case 'text':
        input = `
          <input
            type="text"
            name="${name}"
            id="${name}"
            value="${defaultValue || ''}"
            ${requiredAttr}
            style="width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px;"
          />
        `;
        break;

      case 'paragraph':
        input = `
          <textarea
            name="${name}"
            id="${name}"
            rows="4"
            ${requiredAttr}
            style="width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px; resize: vertical;"
          >${defaultValue || ''}</textarea>
        `;
        break;

      case 'menu':
        input = `
          <select
            name="${name}"
            id="${name}"
            ${requiredAttr}
            style="width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px;"
          >
            ${options?.map(opt => `<option value="${opt}">${opt}</option>`).join('') || ''}
          </select>
        `;
        break;

      case 'date':
        input = `
          <input
            type="date"
            name="${name}"
            id="${name}"
            value="${defaultValue || ''}"
            ${requiredAttr}
            style="width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px;"
          />
        `;
        break;

      case 'toggle':
        const checked = defaultValue === true || defaultValue === 'true' ? 'checked' : '';
        input = `
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              type="checkbox"
              name="${name}"
              id="${name}"
              ${checked}
              style="width: 18px; height: 18px; cursor: pointer;"
            />
            <span style="font-size: 14px; color: #374151;">Enabled</span>
          </label>
        `;
        break;
    }

    return `
      <div style="margin-bottom: 16px;">
        <label
          for="${name}"
          style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #111827;"
        >
          ${label} ${requiredLabel}
        </label>
        ${input}
      </div>
    `;
  }

  // Handle form submission
  private handleSubmit(fields: FormField[]): void {
    const form = this.modal?.querySelector('#textblitz-form') as HTMLFormElement;
    if (!form) return;

    const formData: FormData = {};

    for (const field of fields) {
      const element = form.elements.namedItem(field.name);

      if (element) {
        if (field.type === 'toggle') {
          formData[field.name] = (element as HTMLInputElement).checked;
        } else {
          formData[field.name] = (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
        }
      }
    }

    this.onSubmit?.(formData);
    this.hide();
  }

  // Handle cancel
  private handleCancel(): void {
    this.onCancel?.();
    this.hide();
  }

  // Hide and cleanup
  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.modal = null;
    this.onSubmit = null;
    this.onCancel = null;
  }
}

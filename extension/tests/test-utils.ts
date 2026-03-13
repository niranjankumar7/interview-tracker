/**
 * Test Utilities
 * Helper functions for adapter tests
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Load an HTML fixture file and return a mock Document
 * @param filename - Name of the fixture file in tests/fixtures/
 * @returns Mock Document object with querySelector/querySelectorAll
 */
export function loadFixture(filename: string): Document {
  const fixturePath = resolve(__dirname, 'fixtures', filename);
  const html = readFileSync(fixturePath, 'utf-8');
  return createMockDocument(html);
}

/**
 * Create a mock Document from HTML string
 * Simulates DOM methods used by adapters
 */
function createMockDocument(html: string): Document {
  // Parse the HTML to extract elements
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';

  // Build a simple element index from the HTML
  const elements = parseElements(html);

  return {
    location: { href: 'https://example.com/job/123' } as Location,
    title,
    querySelector: (selector: string): Element | null => {
      // Handle class selectors
      if (selector.startsWith('.')) {
        const className = selector.slice(1).split(/[\s\[]/)[0];
        const el = elements.find(e => e.classList.includes(className));
        return el ? createMockElement(el) : null;
      }
      // Handle attribute selectors like [data-testid="..."]
      if (selector.startsWith('[')) {
        const match = selector.match(/\[(.*?)=?["']?(.*?)["']?\]/);
        if (match) {
          const [, attr, value] = match;
          const el = elements.find(e => {
            const attrValue = e.attributes[attr];
            return value ? attrValue === value : attrValue !== undefined;
          });
          return el ? createMockElement(el) : null;
        }
      }
      // Handle tag selectors
      if (/^[a-zA-Z]+$/.test(selector)) {
        const el = elements.find(e => e.tag === selector);
        return el ? createMockElement(el) : null;
      }
      // Handle descendant selectors (simplified - just check both parts)
      if (selector.includes(' ')) {
        const parts = selector.split(/\s+/);
        const lastPart = parts[parts.length - 1];
        return createMockDocument(html).querySelector(lastPart);
      }
      return null;
    },
    querySelectorAll: (selector: string): NodeListOf<Element> => {
      const results: Element[] = [];
      if (selector.startsWith('.')) {
        const className = selector.slice(1).split(/[\s\[]/)[0];
        elements
          .filter(e => e.classList.includes(className))
          .forEach(e => results.push(createMockElement(e)));
      }
      return results as NodeListOf<Element>;
    },
  } as unknown as Document;
}

interface ParsedElement {
  tag: string;
  classList: string[];
  attributes: Record<string, string>;
  textContent: string;
}

function parseElements(html: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  
  // Match opening tags with attributes
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>([^<]*)/g;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const [, tag, attrString, textContent] = match;
    const classList: string[] = [];
    const attributes: Record<string, string> = {};
    
    // Parse class attribute
    const classMatch = attrString.match(/class=["']([^"']*)["']/);
    if (classMatch) {
      classList.push(...classMatch[1].split(/\s+/).filter(Boolean));
    }
    
    // Parse data-* attributes
    const dataAttrRegex = /data-(\w+?)=["']([^"']*)["']/g;
    let dataMatch;
    while ((dataMatch = dataAttrRegex.exec(attrString)) !== null) {
      attributes[`data-${dataMatch[1]}`] = dataMatch[2];
    }
    
    // Add to element if it has identifying features
    if (classList.length > 0 || Object.keys(attributes).length > 0) {
      elements.push({
        tag: tag.toLowerCase(),
        classList,
        attributes,
        textContent: textContent.trim(),
      });
    }
  }
  
  return elements;
}

function createMockElement(el: ParsedElement): Element {
  return {
    tagName: el.tag.toUpperCase(),
    classList: {
      contains: (c: string) => el.classList.includes(c),
      length: el.classList.length,
      item: (i: number) => el.classList[i] || null,
    } as DOMTokenList,
    textContent: el.textContent,
    getAttribute: (name: string) => el.attributes[name] || null,
  } as unknown as Element;
}

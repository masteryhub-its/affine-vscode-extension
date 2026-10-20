export interface IconSpec {
  /** A codicon id, without the `$()` wrapper. */
  readonly id: string;
  /** A theme colour id such as `charts.yellow`, or undefined for the default text colour. */
  readonly color: string | undefined;
}

export interface PagePresentationInput {
  readonly title: string;
  readonly tags: readonly string[];
  readonly favorite: boolean;
  readonly subpageCount: number;
}

export interface PagePresentation {
  readonly label: string;
  readonly description: string;
  readonly icon: IconSpec;
  readonly tooltip: readonly string[];
}

export interface FolderPresentation {
  readonly label: string;
  readonly description: string;
  readonly icon: IconSpec;
}

const MAX_TAGS_SHOWN = 2;

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function tagSummary(tags: readonly string[]): string | undefined {
  if (tags.length === 0) {
    return undefined;
  }
  const shown = tags.slice(0, MAX_TAGS_SHOWN).join(' · ');
  return tags.length > MAX_TAGS_SHOWN ? `${shown} · +${tags.length - MAX_TAGS_SHOWN}` : shown;
}

/** Everything the pages tree needs to draw one page row, with no editor API involved. */
export function presentPage(input: PagePresentationInput): PagePresentation {
  const title = input.title.trim().length > 0 ? input.title.trim() : 'Untitled';
  const parts: string[] = [];
  const tags = tagSummary(input.tags);
  if (tags !== undefined) {
    parts.push(tags);
  }
  if (input.subpageCount > 0) {
    parts.push(plural(input.subpageCount, 'sub-page', 'sub-pages'));
  }
  const tooltip = [title];
  if (input.favorite) {
    tooltip.push('Favorite');
  }
  if (input.tags.length > 0) {
    tooltip.push(`Tags: ${input.tags.join(', ')}`);
  }
  if (input.subpageCount > 0) {
    tooltip.push(`Sub-pages: ${input.subpageCount}`);
  }
  return {
    label: title,
    description: parts.join(' · '),
    icon: input.favorite ? { id: 'star-full', color: 'charts.yellow' } : { id: 'note', color: undefined },
    tooltip,
  };
}

export interface FolderPresentationInput {
  readonly title: string;
  readonly itemCount: number;
}

export interface WorkspacePresentationInput {
  readonly title: string;
  readonly pageCount: number;
}

export function presentFolder(input: FolderPresentationInput): FolderPresentation {
  return {
    label: input.title.trim().length > 0 ? input.title.trim() : 'Untitled folder',
    description: input.itemCount > 0 ? String(input.itemCount) : '',
    icon: { id: 'folder', color: undefined },
  };
}

export function presentWorkspace(input: WorkspacePresentationInput): FolderPresentation {
  return {
    label: input.title,
    description: input.pageCount > 0 ? plural(input.pageCount, 'page', 'pages') : '',
    icon: { id: 'organization', color: undefined },
  };
}

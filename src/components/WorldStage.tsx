import AutoWorld from '@/components/AutoWorld';
import type { WorldScene } from '@/data/world';

interface Props {
  /** Undefined for a project with no deck — then there is nothing to show. */
  scenes?: WorldScene[];
  /** Selector Skip jumps to. */
  skipTo: string;
}

/**
 * A deck of films, played rather than scrubbed: one screen, starts on arrival,
 * hands the page over when it is done.
 *
 * This used to pick between two engines. The index deck was dragged by the
 * scroll and the case studies played themselves, which meant two ways to watch
 * the same kind of thing, two sets of chrome, and — for a reader who landed on
 * the index — four screens of scrolling before the list of projects. Both
 * decks play now, so all that is left here is the guard.
 */
export default function WorldStage({ scenes, skipTo }: Props) {
  if (!scenes?.length) return null;
  return <AutoWorld scenes={scenes} skipTo={skipTo} />;
}

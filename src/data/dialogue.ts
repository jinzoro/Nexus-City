/**
 * Short branching conversations for interior NPCs. Each archetype has one
 * greeting tree with three choices: lore (discovers a codex entry), a civic
 * hook (raises faction standing) and a street read (flavour). The tree is
 * deterministic per archetype/role so the same floor tells a consistent story.
 */
import type { FactionId } from '../types'
import type { Archetype } from '../engine/interior'

export interface DialogueReply {
  label: string
  reply: string
  codexId?: string
  faction?: FactionId
  delta?: number
}

export interface DialogueTree {
  greet: string
  replies: DialogueReply[]
}

const TREES: Record<Archetype, DialogueTree> = {
  lobby: {
    greet: 'You are cleared for the public floors. Everything above the atrium is leased, insured, or both.',
    replies: [
      {
        label: 'ASK ABOUT THE CAVERN',
        reply:
          'Ceiling survey says eleven kilometres. Nobody has walked the whole rim. The lifts only go down as far as the plans admit.',
        codexId: 'sys-cavern',
      },
      {
        label: 'REPORT A GRID FAULT',
        reply: 'Logged with the Civic Synod. They will pretend it was already on the schedule.',
        faction: 'civic',
        delta: 2,
      },
      {
        label: 'JUST LOOKING AROUND',
        reply: 'Then look up. The good neon is on the leased floors, and it is paid for by the hour.',
      },
    ],
  },
  office: {
    greet: 'Desk twelve is empty if you need a terminal. Do not touch the audit stack, it bites.',
    replies: [
      {
        label: 'WHO SIGNS THE AUDIT?',
        reply:
          'The civic scheduler signs everything and reads nothing. That is the whole trick of the mesh: automation with a signature.',
        codexId: 'sys-civic-ai',
      },
      {
        label: 'OFFER TO TAKE A SHIFT',
        reply: 'Guild will remember that. Overtime is the only currency that still appreciates down here.',
        faction: 'guild',
        delta: 2,
      },
      {
        label: 'ASK ABOUT THE VIEW',
        reply: 'There is no view. There is a window with a rendered feed and a tenant who pays extra for it.',
      },
    ],
  },
  market: {
    greet: 'Stall rules: no credit on the first visit, no questions about the second box, no leaving without eating.',
    replies: [
      {
        label: 'ASK WHERE THE STOCK CAME FROM',
        reply:
          'Kuro moves it, Verdant grows it, and the manifest says it fell off a maglev. Signage is a civic art.',
        codexId: 'sys-neon',
      },
      {
        label: 'BUY A BOWL',
        reply: 'Good trade. The Kuro Family notes a customer who pays without haggling.',
        faction: 'kuro',
        delta: 3,
      },
      {
        label: 'ASK ABOUT THE RAIN',
        reply: 'Bottled drizzle, two credits. Tastes like the ceiling and sells out before the condenser stops.',
      },
    ],
  },
  industrial: {
    greet: 'Mind the gantry. The fab bay vents hot enough to peel a visor, and the foreman counts every finger.',
    replies: [
      {
        label: 'ASK WHAT THEY BUILD',
        reply:
          'Panels, brackets, replacement parts for parts nobody lists. A city this old is mostly maintenance with lights on.',
        codexId: 'sys-maglev',
      },
      {
        label: 'VOLUNTEER FOR A CREW',
        reply: 'Foundry Guild logs your name. Crews remember who showed up before the alarm, not after.',
        faction: 'guild',
        delta: 3,
      },
      {
        label: 'ASK ABOUT THE FLOOR',
        reply: 'Layers. We cut a shaft once and hit somebody else’s foundation. Nobody filed a report.',
      },
    ],
  },
  residential: {
    greet: 'Keep it quiet past the third unit. The night shift sleeps through the noon cycle and the walls are paper.',
    replies: [
      {
        label: 'ASK ABOUT THE NEIGHBOURS',
        reply:
          'Forty units on a floor that was drawn for twenty. The hab-block lease says families, the plans say something else.',
        codexId: 'dist-residential',
      },
      {
        label: 'OFFER TO CARRY SUPPLIES',
        reply: 'Verdant will hear about it. Up here, a full water can is worth more than a faction badge.',
        faction: 'verdant',
        delta: 2,
      },
      {
        label: 'APOLOGISE FOR THE NOISE',
        reply: 'Everyone is loud. It is how we know the power is still on.',
      },
    ],
  },
  server: {
    greet: 'Do not touch the cold aisle. The racks are older than the leases and twice as honest.',
    replies: [
      {
        label: 'ASK WHAT THE AI IS DOING',
        reply:
          'Routing. Always routing. Its oldest queued message is a maintenance request from before the current council.',
        codexId: 'sys-civic-ai',
      },
      {
        label: 'OFFER SPARE COOLANT',
        reply: 'Cortex records the favour. Cooling is how this district earns its standing.',
        faction: 'cortex',
        delta: 3,
      },
      {
        label: 'ASK ABOUT THE ARCHIVE',
        reply: 'Everything is archived. Retrieval is the expensive part, and the index is a rumour.',
      },
    ],
  },
  entertainment: {
    greet: 'Show starts when the sign flickers. If it does not flicker, the grid is out and the show is better.',
    replies: [
      {
        label: 'ASK ABOUT THE ADS',
        reply:
          'Every sign is a load-bearing ad. When one goes dark, the block reads it as a distress call and the rent drops.',
        codexId: 'sys-neon',
      },
      {
        label: 'BUY THE ROOM A ROUND',
        reply: 'Aureus likes a patron. The Civic Synod likes that you did it without a permit.',
        faction: 'aureus',
        delta: 3,
      },
      {
        label: 'ASK WHO HEADLINES',
        reply: 'A hologram with a contract. The real one has not been seen since the last festival blackout.',
      },
    ],
  },
  bio: {
    greet: 'Do not breathe on the nursery beds. They are the only thing on this floor that is not synthetic.',
    replies: [
      {
        label: 'ASK HOW THE FARM WORKS',
        reply:
          'Condenser water, filtered light, seed stock older than the cavern. The weather is scheduled, the harvest is not.',
        codexId: 'sys-weather',
      },
      {
        label: 'HELP TEND THE BEDS',
        reply: 'Verdant Conservancy logs the hours. Green standing is slow, but it keeps the air breathable.',
        faction: 'verdant',
        delta: 3,
      },
      {
        label: 'ASK ABOUT THE TREES',
        reply: 'Grafted from a surface sample. Nobody admits which surface, and the leaves are the wrong green.',
      },
    ],
  },
  transit: {
    greet: 'The board lies about the next train. The platform knows better. Stand back from the yellow line.',
    replies: [
      {
        label: 'ASK ABOUT THE LINES',
        reply:
          'Cyan and magenta take passengers. Amber takes freight and things with no manifest. All three take their time.',
        codexId: 'sys-maglev',
      },
      {
        label: 'REPORT A DELAY',
        reply: 'Transit authority accepts the report and schedules it for review. That is the whole apology.',
        faction: 'civic',
        delta: 2,
      },
      {
        label: 'ASK WHERE THE LAST TRAIN GOES',
        reply: 'The loop. It always comes back, unless the dwell timer holds and then nobody talks about it.',
      },
    ],
  },
}

export function dialogueFor(archetype: Archetype, role: string, buildingName: string): DialogueTree {
  const tree = TREES[archetype] ?? TREES.office
  return {
    greet: `${tree.greet} — ${role} at ${buildingName}.`,
    replies: tree.replies,
  }
}

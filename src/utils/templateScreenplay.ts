// Professional sample screenplay for "The Last Signal"
import type { Descendant } from 'slate';

export const TEMPLATE_SCREENPLAY_SLATE: Descendant[] = [
  {
    type: 'scene-heading',
    children: [{ text: 'EXT. ATACAMA DESERT - RADIO OBSERVATORY - NIGHT' }],
  },
  {
    type: 'action',
    children: [
      {
        text: 'A sea of white dish antennas tilt toward the cosmos under a blanket of unpolluted Andean stars. Total silence, save for the dry whistle of high-altitude wind.',
      },
    ],
  },
  {
    type: 'action',
    children: [
      {
        text: 'Red beacon lights pulse on the towers, synchronized with the rhythmic hum of giant sub-zero cooling pumps.',
      },
    ],
  },
  {
    type: 'scene-heading',
    children: [{ text: 'INT. CONTROL ROOM - CONTINUOUS' }],
  },
  {
    type: 'action',
    children: [
      {
        text: 'Fluorescent glow and the green glow of twenty CRT monitors. Empty coffee cups litter the workstation of DR. ELENA VANCE (40s), haggard, brilliant, wearing an oversized wool sweater.',
      },
    ],
  },
  {
    type: 'action',
    children: [
      {
        text: 'A high-pitched tone WARBLES from the audio monitor. Elena freezes, sandwich halfway to her mouth.',
      },
    ],
  },
  {
    type: 'character',
    children: [{ text: 'ELENA' }],
  },
  {
    type: 'parenthetical',
    children: [{ text: '(whispering)' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'Not satellite chatter. Come on, tell me you are real.' }],
  },
  {
    type: 'action',
    children: [
      {
        text: 'Her fingers fly across the mechanical keyboard. A waterfall spectrogram blooms across the central monitor — pulsating in perfect prime-number groupings.',
      },
    ],
  },
  {
    type: 'action',
    children: [
      {
        text: 'MARCUS (30s), night technician in a thermal parka, shuffles in holding a lukewarm kettle.',
      },
    ],
  },
  {
    type: 'character',
    children: [{ text: 'MARCUS' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'Frequency drift on array four again. The frost is cracking the fiber couplers.' }],
  },
  {
    type: 'character',
    children: [{ text: 'ELENA' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'Marcus. Put the kettle down. Look at monitor three.' }],
  },
  {
    type: 'action',
    children: [
      {
        text: 'Marcus glances up casually, then his eyes widen. He drops the kettle into the wastebasket.',
      },
    ],
  },
  {
    type: 'character',
    children: [{ text: 'MARCUS' }],
  },
  {
    type: 'parenthetical',
    children: [{ text: '(breathless)' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'That carrier wave... what is the origin coordinates?' }],
  },
  {
    type: 'character',
    children: [{ text: 'ELENA' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'Right ascension 19 hours, 50 minutes. Declination plus eight degrees. The Oort cloud.' }],
  },
  {
    type: 'character',
    children: [{ text: 'MARCUS' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'Nothing is out there. Nothing with power output like that.' }],
  },
  {
    type: 'character',
    children: [{ text: 'ELENA' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'There is now. And Marcus? It is modulating in mathematical primes.' }],
  },
  {
    type: 'transition',
    children: [{ text: 'SMASH CUT TO:' }],
  },
  {
    type: 'scene-heading',
    children: [{ text: 'INT. PENTAGON - CRISIS BRIEFING ROOM - DAWN' }],
  },
  {
    type: 'action',
    children: [
      {
        text: 'A windowless vault beneath Washington. GENERAL TRENT (60s) slams a classified satellite printout onto the teak conference table.',
      },
    ],
  },
  {
    type: 'character',
    children: [{ text: 'GENERAL TRENT' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'I don’t care if it’s little green men or a Russian deep-space drone. How long until the public knows?' }],
  },
  {
    type: 'action',
    children: [
      {
        text: 'DR. ARLO CHEN (50s), Science Advisor, looks pale as he adjusts his glasses.',
      },
    ],
  },
  {
    type: 'character',
    children: [{ text: 'ARLO' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'Every amateur telescope array from Chile to Munich has caught the signal. We have maybe four hours before Twitter solves the handshake.' }],
  },
  {
    type: 'transition',
    children: [{ text: 'FADE OUT.' }],
  },
] as any as Descendant[];

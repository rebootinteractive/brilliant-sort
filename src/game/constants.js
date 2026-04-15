export const GRID_ROWS = 10;   // 10 × 12 = 120 = 10 colors × 12 pieces (12 = 2 × 6 ✓)
export const GRID_COLS = 12;
export const BOX_COUNT = 10;
export const BOX_CAPACITY = 6; // 3x2

// 10 colors evenly spread around the hue wheel (~36° apart)
// brown replaced with cyan to fill the teal→blue gap
export const COLORS = [
  'red',      //   0° — pure red
  'orange',   //  30° — deep orange
  'yellow',   //  58° — bright yellow
  'lime',     //  90° — yellow-green
  'green',    // 142° — pure green
  'teal',     // 175° — blue-green
  'cyan',     // 200° — sky / cornflower
  'blue',     // 242° — royal / indigo-blue
  'purple',   // 278° — violet
  'pink',     // 320° — hot pink / magenta
];

// How many pieces of each color (GRID_ROWS * GRID_COLS / COLORS.length)
export const PIECES_PER_COLOR = (GRID_ROWS * GRID_COLS) / COLORS.length; // 12

// Vivid piece colors
export const COLOR_HEX = {
  red:    '#e83030',
  orange: '#e87810',
  yellow: '#e0cc10',
  lime:   '#80e018',
  green:  '#1ab840',
  teal:   '#10b898',
  cyan:   '#10b8e8',
  blue:   '#2838e0',
  purple: '#8018e0',
  pink:   '#e01898',
};

// Dark slot background (same hue, much lower lightness)
export const SLOT_HEX = {
  red:    '#6e1414',
  orange: '#6e3008',
  yellow: '#585008',
  lime:   '#305808',
  green:  '#0a5020',
  teal:   '#085040',
  cyan:   '#085060',
  blue:   '#101070',
  purple: '#360878',
  pink:   '#6e0848',
};

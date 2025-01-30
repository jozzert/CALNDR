export const eventColors = {
  getEventBackground: (color: string) => {
    const opacity = 0.1;
    return `rgba(${hexToRgb(color)}, ${opacity})`;
  },
  getEventBorder: (color: string) => {
    return color;
  },
  getEventTextColor: (color: string) => {
    const rgb = hexToRgb(color);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#374151' : '#F3F4F6';
  }
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
} 
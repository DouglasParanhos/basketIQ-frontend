/** Names and texts read from the page have the no-break space before «%» and «€»; the expectations are written with a plain space. */
export const nb = (text: string) => text.replace(/ ([%€])/g, "\u00a0$1");

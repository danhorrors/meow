export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

export const parseCsv = (input: string, delimiter: string = ','): CsvParseResult => {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    current.push(field);
    field = '';
  };

  const pushRow = () => {
    // avoid pushing empty trailing row
    if (current.length > 0 || field.length > 0) {
      if (field.length > 0 || current.length > 0) {
        pushField();
      }
      rows.push(current);
      current = [];
    }
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"') {
      const next = input[i + 1];
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[i + 1] === '\n') {
        i++;
      }
      pushRow();
      continue;
    }

    field += char;
  }

  pushRow();

  const headers = rows.length > 0 ? rows[0].map((header) => header.trim()) : [];
  const dataRows = rows.length > 1 ? rows.slice(1) : [];

  return { headers, rows: dataRows };
};

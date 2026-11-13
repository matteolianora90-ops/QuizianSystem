// Lightweight zero-dependency DOCX text extractor (reads word/document.xml inside the ZIP container)
export async function extractDocxText(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    let offset = 0;
    while (offset + 30 <= bytes.length) {
      // Local file header signature 0x04034b50
      if (view.getUint32(offset, true) !== 0x04034b50) break;

      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraFieldLength = view.getUint16(offset + 28, true);

      const nameStart = offset + 30;
      const nameEnd = nameStart + fileNameLength;
      const fileName = new TextDecoder().decode(bytes.slice(nameStart, nameEnd));
      const dataStart = nameEnd + extraFieldLength;

      // Handle data descriptor if compressedSize === 0 (bit 3 flag)
      const dataEnd = compressedSize > 0 ? dataStart + compressedSize : bytes.length;

      if (fileName === 'word/document.xml') {
        const compressedBytes = bytes.slice(dataStart, dataEnd);
        let xmlText = '';

        if (compressionMethod === 0) {
          xmlText = new TextDecoder('utf-8').decode(compressedBytes);
        } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
          const stream = new Blob([compressedBytes])
            .stream()
            .pipeThrough(new DecompressionStream('deflate-raw'));
          xmlText = await new Response(stream).text();
        }

        if (xmlText) {
          return xmlText
            .replace(/<\/w:p>/g, '\n')
            .replace(/<w:br[^>]*\/>/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
        }
      }

      if (compressedSize === 0) break;
      offset = dataStart + compressedSize;
    }
  } catch {
    // Fallback below
  }

  // Fallback plain-text strip if zip headers use data descriptors
  const fallbackRaw = await file.text().catch(() => '');
  return fallbackRaw
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

import React, { useState, useRef } from "react";
import { usePdf } from "../hooks/usePdf";

export const MyPdfViewer = () => {
  const [page, setPage] = useState(1);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);

  const { pdfDocument, pdfPage } = usePdf({
    file: "test.pdf",
    page,
    canvasRef,
    textLayerRef,
  });

  return (
    <div>
      {!pdfDocument && <span>Loading...</span>}
      <canvas ref={canvasRef} />
      <div ref={textLayerRef} className="textLayer" />
      {Boolean(pdfDocument && pdfDocument.numPages) && (
        <nav>
          <ul className="pager">
            <li className="previous">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
            </li>
            <li className="next">
              <button
                disabled={page === pdfDocument!.numPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};

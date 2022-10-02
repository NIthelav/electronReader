import { useState, useEffect, useRef } from "react";
import * as pdfjs from "pdfjs-dist";
import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

type PDFRenderTask = ReturnType<PDFPageProxy["render"]>;

type HookProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  file: string;
  page?: number;
  workerSrc?: string;
  textLayerRef: React.RefObject<HTMLDivElement | null>;
};

type HookReturnValues = {
  pdfDocument: PDFDocumentProxy | undefined;
  pdfPage: PDFPageProxy | undefined;
};

export const usePdf = ({
  canvasRef,
  file,
  textLayerRef,
  page = 1,
  workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`,
}: HookProps): HookReturnValues => {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy>();
  const [pdfPage, setPdfPage] = useState<PDFPageProxy>();
  const renderTask = useRef<PDFRenderTask | null>(null);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }, [workerSrc]);

  useEffect(() => {
    const config: DocumentInitParameters = { url: file };

    pdfjs.getDocument(config).promise.then((loadedPdfDocument) => {
      setPdfDocument(loadedPdfDocument);
    });
  }, [file]);

  useEffect(() => {
    // draw a page of the pdf
    const drawPDF = (page: PDFPageProxy) => {
      const dpRatio = window.devicePixelRatio;
      const viewport = page.getViewport({ scale: dpRatio });
      const canvasEl = canvasRef.current;
      if (!canvasEl) {
        return;
      }

      const canvasContext = canvasEl.getContext("2d");
      if (!canvasContext) {
        return;
      }

      canvasEl.style.width = `${viewport.width / dpRatio}px`;
      canvasEl.style.height = `${viewport.height / dpRatio}px`;
      canvasEl.height = viewport.height;
      canvasEl.width = viewport.width;

      // if previous render isn't done yet, we cancel it
      if (renderTask.current) {
        renderTask.current.cancel();
        return;
      }

      renderTask.current = page.render({
        canvasContext,
        viewport,
      });

      return renderTask.current.promise
        .then(
          () => {
            renderTask.current = null;
          },
          (reason: Error) => {
            renderTask.current = null;

            if (reason && reason.name === "RenderingCancelledException") {
              drawPDF(page);
            }
          }
        )
        .then(function () {
          // Returns a promise, on resolving it will return text contents of the page
          return page.getTextContent();
        })
        .then(function (textContent) {
          // Assign CSS to the textLayer element
          // var textLayer = document.querySelector(".textLayer");
          const textLayer = textLayerRef.current;
          const canvas = canvasRef.current;
          if (textLayer !== null && canvas !== null) {
            textLayer.textContent = "";
            textLayer.style.left = canvas.offsetLeft + "px";
            textLayer.style.top = canvas.offsetTop + "px";
            textLayer.style.height = canvas.offsetHeight + "px";
            textLayer.style.width = canvas.offsetWidth + "px";
          }

          // Pass the data to the method for rendering of text over the pdf canvas.
          if (textLayerRef.current) {
            pdfjs.renderTextLayer({
              textContent: textContent,
              container: textLayerRef.current,
              viewport: viewport,
              textDivs: [],
            });
          }
        });
    };

    //   renderTask.promise.then(function() {
    //     pageRendering = false;
    //     if (pageNumPending !== null) {
    //       // New page rendering is pending
    //       renderPage(pageNumPending);
    //       pageNumPending = null;
    //     }
    //   })

    // });

    if (pdfDocument) {
      pdfDocument.getPage(page).then(
        (loadedPdfPage) => {
          setPdfPage(loadedPdfPage);

          // if (isFunction(onPageLoadSuccessRef.current)) {
          //   onPageLoadSuccessRef.current(loadedPdfPage);
          // }

          drawPDF(loadedPdfPage);
        },
        () => {
          // if (isFunction(onPageLoadFailRef.current)) {
          //   onPageLoadFailRef.current();
          // }
        }
      );
    }
  }, [canvasRef, page, pdfDocument, textLayerRef]);

  return { pdfDocument, pdfPage };
};

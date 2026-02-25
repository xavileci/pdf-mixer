'use client';

import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { UploadCloud, FileText, Trash2, Download, Eye, Loader2, FolderOpen, FilePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export default function PdfMerger() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [mergedPdfSize, setMergedPdfSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFilesAdded = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const pdfFiles = Array.from(newFiles).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      alert('Por favor, selecciona solo archivos PDF.');
      return;
    }

    setFiles(prevFiles => {
      const existingNames = new Set(prevFiles.map(f => f.name));
      const addedFiles = pdfFiles
        .filter(f => !existingNames.has(f.name))
        .map(f => ({
          id: Math.random().toString(36).substring(7),
          file: f,
          name: f.name,
          size: f.size
        }));

      const allFiles = [...prevFiles, ...addedFiles];
      
      // Sort files by name (e.g., 000.pdf first)
      return allFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFilesAdded(e.dataTransfer.files);
  }, [handleFilesAdded]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setMergedPdfUrl(null);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      alert('Por favor, selecciona al menos dos archivos PDF para combinar.');
      return;
    }

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of files) {
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      // Save the merged PDF
      const pdfBytes = await mergedPdf.save({ useObjectStreams: true }); // useObjectStreams helps optimize size slightly
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setMergedPdfUrl(url);
      setMergedPdfSize(blob.size);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Hubo un error al combinar los PDFs. Asegúrate de que los archivos no estén corruptos o protegidos por contraseña.');
    } finally {
      setIsMerging(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Combina tus PDFs</h1>
        <p className="text-slate-500">Selecciona archivos o carpetas. Se ordenarán automáticamente por nombre.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Input and List */}
        <div className="space-y-6">
          {/* Dropzone */}
          <div 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-2">Arrastra y suelta tus PDFs aquí</p>
            <p className="text-slate-400 text-sm mb-6">o haz clic para seleccionar archivos</p>
            
            <div className="flex flex-wrap justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <FilePlus className="w-4 h-4" />
                Archivos
              </button>
              <button 
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <FolderOpen className="w-4 h-4" />
                Carpeta
              </button>
            </div>

            <input 
              type="file" 
              multiple 
              accept="application/pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => handleFilesAdded(e.target.files)}
            />
            <input 
              type="file" 
              {...({ webkitdirectory: "", directory: "" } as any)}
              className="hidden" 
              ref={folderInputRef}
              onChange={(e) => handleFilesAdded(e.target.files)}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-semibold text-slate-800">Archivos seleccionados ({files.length})</h3>
                <button 
                  onClick={clearAll}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Limpiar todo
                </button>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                <AnimatePresence>
                  {files.map((file, index) => (
                    <motion.div 
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
                          {index + 1}
                        </div>
                        <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                          <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFile(file.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-6">
                <button
                  onClick={mergePdfs}
                  disabled={files.length < 2 || isMerging}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Combinando...
                    </>
                  ) : (
                    <>
                      Combinar PDFs
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-500" />
              Vista Previa
            </h2>
            {mergedPdfUrl && (
              <div className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                Optimizado: {formatSize(mergedPdfSize)}
              </div>
            )}
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden relative shadow-inner">
            {mergedPdfUrl ? (
              <iframe 
                src={`${mergedPdfUrl}#toolbar=0`} 
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p>El documento combinado aparecerá aquí.</p>
                <p className="text-sm mt-2 opacity-70">Añade archivos y haz clic en &quot;Combinar PDFs&quot; para ver el resultado.</p>
              </div>
            )}
          </div>

          {mergedPdfUrl && (
            <div className="mt-6">
              <a
                href={mergedPdfUrl}
                download="Documento_Combinado.pdf"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" />
                Descargar PDF Combinado
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

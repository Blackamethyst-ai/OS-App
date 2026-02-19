import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { openDB, IDBPDatabase, DBSchema } from 'idb';
import {
    Upload, X, Trash2, Maximize2, Grid, Columns,
    Image as ImageIcon, FolderOpen, Plus, Tag,
    ChevronLeft, ChevronRight, Download, ZoomIn
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { audio } from '../../services/audioService';

// ============================================================================
// SOVEREIGN GALLERY — Cinematic Image Vault
// ============================================================================

interface GalleryImage {
    id: string;
    name: string;
    blob: Blob;
    thumbnail: Blob;
    width: number;
    height: number;
    collection: string;
    tags: string[];
    timestamp: number;
    objectUrl?: string;
    thumbUrl?: string;
}

interface GalleryDBSchema extends DBSchema {
    gallery_images: {
        key: string;
        value: Omit<GalleryImage, 'objectUrl' | 'thumbUrl'>;
        indexes: {
            'by-date': number;
            'by-collection': string;
        };
    };
}

// --- DB Service ---

const DB_NAME = 'sovereign_gallery_v1';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<GalleryDBSchema> | null = null;

async function getDB(): Promise<IDBPDatabase<GalleryDBSchema>> {
    if (dbInstance) return dbInstance;
    dbInstance = await openDB<GalleryDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('gallery_images')) {
                const store = db.createObjectStore('gallery_images', { keyPath: 'id' });
                store.createIndex('by-date', 'timestamp');
                store.createIndex('by-collection', 'collection');
            }
        },
    });
    return dbInstance;
}

async function createThumbnail(file: Blob, maxSize = 400): Promise<Blob> {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio = Math.min(maxSize / img.width, maxSize / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob || file);
                },
                'image/webp',
                0.8
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        img.src = url;
    });
}

async function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ width: 1920, height: 1080 });
        };
        img.src = url;
    });
}

// --- Component ---

type LayoutMode = 'grid' | 'masonry';

const SovereignGallery: React.FC = () => {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [layout, setLayout] = useState<LayoutMode>('masonry');
    const [activeCollection, setActiveCollection] = useState<string>('all');
    const [collections, setCollections] = useState<string[]>(['all']);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Load images from IndexedDB
    const loadImages = useCallback(async () => {
        const db = await getDB();
        const all = await db.getAllFromIndex('gallery_images', 'by-date');
        const reversed = all.reverse();

        // Build collection list
        const collSet = new Set<string>(['all']);
        reversed.forEach((img) => collSet.add(img.collection));
        setCollections(Array.from(collSet));

        // Create object URLs
        const withUrls: GalleryImage[] = reversed.map((img) => ({
            ...img,
            objectUrl: URL.createObjectURL(img.blob),
            thumbUrl: URL.createObjectURL(img.thumbnail),
        }));

        setImages(withUrls);
    }, []);

    useEffect(() => {
        loadImages();
        return () => {
            images.forEach((img) => {
                if (img.objectUrl) URL.revokeObjectURL(img.objectUrl);
                if (img.thumbUrl) URL.revokeObjectURL(img.thumbUrl);
            });
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Upload files
    const uploadFiles = useCallback(async (files: FileList | File[]) => {
        setIsUploading(true);
        const db = await getDB();
        const fileArray = Array.from(files).filter((f) =>
            f.type.startsWith('image/')
        );

        for (const file of fileArray) {
            const id = crypto.randomUUID();
            const thumbnail = await createThumbnail(file);
            const dims = await getImageDimensions(file);

            await db.put('gallery_images', {
                id,
                name: file.name,
                blob: file,
                thumbnail,
                width: dims.width,
                height: dims.height,
                collection: 'Uncategorized',
                tags: [],
                timestamp: Date.now(),
            });
        }

        setIsUploading(false);
        audio.playClick();
        await loadImages();
    }, [loadImages]);

    // Delete image
    const deleteImage = useCallback(async (id: string) => {
        const db = await getDB();
        await db.delete('gallery_images', id);
        audio.playClick();
        setSelectedImage(null);
        await loadImages();
    }, [loadImages]);

    // Download image
    const downloadImage = useCallback((img: GalleryImage) => {
        if (!img.objectUrl) return;
        const a = document.createElement('a');
        a.href = img.objectUrl;
        a.download = img.name;
        a.click();
    }, []);

    // Drag & drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === dropZoneRef.current) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) {
                await uploadFiles(e.dataTransfer.files);
            }
        },
        [uploadFiles]
    );

    // Lightbox navigation
    const navigateLightbox = useCallback(
        (direction: 'prev' | 'next') => {
            if (!selectedImage) return;
            const filtered = activeCollection === 'all'
                ? images
                : images.filter((i) => i.collection === activeCollection);
            const idx = filtered.findIndex((i) => i.id === selectedImage.id);
            if (idx === -1) return;
            const nextIdx = direction === 'next'
                ? (idx + 1) % filtered.length
                : (idx - 1 + filtered.length) % filtered.length;
            setSelectedImage(filtered[nextIdx]);
            audio.playClick();
        },
        [selectedImage, images, activeCollection]
    );

    // Keyboard nav for lightbox
    useEffect(() => {
        if (!selectedImage) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedImage(null);
            if (e.key === 'ArrowRight') navigateLightbox('next');
            if (e.key === 'ArrowLeft') navigateLightbox('prev');
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedImage, navigateLightbox]);

    const filteredImages = activeCollection === 'all'
        ? images
        : images.filter((i) => i.collection === activeCollection);

    const isEmpty = images.length === 0;

    return (
        <div
            ref={dropZoneRef}
            className="h-full flex flex-col relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B2CFF]/30 to-[#18E6FF]/30 border border-[#7B2CFF]/40 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-[#18E6FF]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold tracking-wider text-white/90 uppercase">
                            Sovereign Vault
                        </h2>
                        <span className="text-[10px] text-white/40 font-mono tracking-widest">
                            {images.length} ASSET{images.length !== 1 ? 'S' : ''} SECURED
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Layout toggle */}
                    <button
                        onClick={() => { setLayout(layout === 'grid' ? 'masonry' : 'grid'); audio.playClick(); }}
                        className="p-1.5 rounded-md border border-white/10 hover:border-[#7B2CFF]/40 hover:bg-[#7B2CFF]/10 transition-all"
                        title={layout === 'grid' ? 'Masonry layout' : 'Grid layout'}
                    >
                        {layout === 'grid' ? <Columns className="w-3.5 h-3.5 text-white/50" /> : <Grid className="w-3.5 h-3.5 text-white/50" />}
                    </button>

                    {/* Upload button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7B2CFF]/20 border border-[#7B2CFF]/40 hover:bg-[#7B2CFF]/30 transition-all text-xs font-mono text-[#18E6FF] tracking-wide"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        ADD ASSETS
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                    />
                </div>
            </div>

            {/* Collection filter */}
            {collections.length > 1 && (
                <div className="flex items-center gap-1.5 mb-3 flex-shrink-0 overflow-x-auto no-scrollbar pb-1">
                    {collections.map((col) => (
                        <button
                            key={col}
                            onClick={() => { setActiveCollection(col); audio.playClick(); }}
                            className={cn(
                                'px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider border transition-all whitespace-nowrap',
                                activeCollection === col
                                    ? 'bg-[#7B2CFF]/30 border-[#7B2CFF]/60 text-[#18E6FF]'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                            )}
                        >
                            {col.toUpperCase()}
                        </button>
                    ))}
                </div>
            )}

            {/* Drop overlay */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl border-2 border-dashed border-[#18E6FF]/60 rounded-xl"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            >
                                <Upload className="w-12 h-12 text-[#18E6FF]" />
                            </motion.div>
                            <span className="text-sm font-mono text-[#18E6FF] tracking-widest">
                                DROP ASSETS TO SECURE
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload progress overlay */}
            <AnimatePresence>
                {isUploading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-[#7B2CFF] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-mono text-[#18E6FF] tracking-wider">
                                SECURING ASSETS...
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty state */}
            {isEmpty && (
                <div className="flex-1 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4 p-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7B2CFF]/10 to-[#18E6FF]/10 border border-[#7B2CFF]/20 flex items-center justify-center">
                            <FolderOpen className="w-8 h-8 text-white/20" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-white/40 font-mono tracking-wide">
                                VAULT EMPTY
                            </p>
                            <p className="text-xs text-white/20 mt-1 font-mono">
                                Drop images here or click ADD ASSETS
                            </p>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7B2CFF]/20 border border-[#7B2CFF]/40 hover:bg-[#7B2CFF]/30 transition-all text-xs font-mono text-[#18E6FF] tracking-wider"
                        >
                            <Upload className="w-4 h-4" />
                            UPLOAD FIRST ASSET
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Image grid */}
            {!isEmpty && (
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {layout === 'masonry' ? (
                        <MasonryGrid images={filteredImages} onSelect={setSelectedImage} />
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {filteredImages.map((img) => (
                                <ImageCard key={img.id} image={img} onSelect={setSelectedImage} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox */}
            <AnimatePresence>
                {selectedImage && (
                    <Lightbox
                        image={selectedImage}
                        onClose={() => setSelectedImage(null)}
                        onDelete={deleteImage}
                        onDownload={downloadImage}
                        onPrev={() => navigateLightbox('prev')}
                        onNext={() => navigateLightbox('next')}
                        total={filteredImages.length}
                        current={filteredImages.findIndex((i) => i.id === selectedImage.id) + 1}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Masonry Grid ---

const MasonryGrid: React.FC<{
    images: GalleryImage[];
    onSelect: (img: GalleryImage) => void;
}> = ({ images, onSelect }) => {
    const cols = 3;
    const columns: GalleryImage[][] = Array.from({ length: cols }, () => []);
    const heights = new Array(cols).fill(0);

    images.forEach((img) => {
        const shortestCol = heights.indexOf(Math.min(...heights));
        columns[shortestCol].push(img);
        heights[shortestCol] += img.height / img.width;
    });

    return (
        <div className="flex gap-2">
            {columns.map((col, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-2">
                    {col.map((img) => (
                        <ImageCard key={img.id} image={img} onSelect={onSelect} />
                    ))}
                </div>
            ))}
        </div>
    );
};

// --- Image Card ---

const ImageCard: React.FC<{
    image: GalleryImage;
    onSelect: (img: GalleryImage) => void;
}> = ({ image, onSelect }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => { onSelect(image); audio.playClick(); }}
            className="group relative cursor-pointer rounded-lg overflow-hidden bg-white/5 border border-white/5 hover:border-[#7B2CFF]/40 transition-all duration-300"
        >
            {/* Image */}
            <img
                src={image.thumbUrl}
                alt={image.name}
                className="w-full block object-cover"
                loading="lazy"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Scan line effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        className="absolute left-0 right-0 h-px bg-[#18E6FF]/30"
                        initial={{ top: '100%' }}
                        whileInView={{ top: '-10%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                </div>

                {/* Corner accents */}
                <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-[#18E6FF]/50" />
                <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-[#18E6FF]/50" />
                <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-[#18E6FF]/50" />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-[#18E6FF]/50" />

                {/* Info bar */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-white/70 truncate max-w-[70%] tracking-wide">
                            {image.name}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-mono text-[#18E6FF]/60">
                                {image.width}x{image.height}
                            </span>
                            <ZoomIn className="w-3 h-3 text-[#18E6FF]/60" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Glow border on hover */}
            <div className="absolute inset-0 rounded-lg border border-[#7B2CFF]/0 group-hover:border-[#7B2CFF]/30 group-hover:shadow-[0_0_15px_rgba(123,44,255,0.15)] transition-all duration-300 pointer-events-none" />
        </motion.div>
    );
};

// --- Lightbox ---

const Lightbox: React.FC<{
    image: GalleryImage;
    onClose: () => void;
    onDelete: (id: string) => void;
    onDownload: (img: GalleryImage) => void;
    onPrev: () => void;
    onNext: () => void;
    total: number;
    current: number;
}> = ({ image, onClose, onDelete, onDownload, onPrev, onNext, total, current }) => {
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl"
            onClick={onClose}
        >
            {/* Top bar */}
            <div
                className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4 bg-gradient-to-b from-black/60 to-transparent z-10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-white/50 tracking-wider">
                        {current} / {total}
                    </span>
                    <span className="text-[10px] font-mono text-white/30 truncate max-w-[300px]">
                        {image.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#18E6FF]/40">
                        {image.width} x {image.height}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onDownload(image)}
                        className="p-2 rounded-md hover:bg-white/10 transition-colors"
                        title="Download"
                    >
                        <Download className="w-4 h-4 text-white/50 hover:text-white/80" />
                    </button>
                    <button
                        onClick={() => setShowConfirmDelete(true)}
                        className="p-2 rounded-md hover:bg-red-500/20 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md hover:bg-white/10 transition-colors"
                        title="Close (Esc)"
                    >
                        <X className="w-4 h-4 text-white/50 hover:text-white/80" />
                    </button>
                </div>
            </div>

            {/* Navigation arrows */}
            {total > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#7B2CFF]/40 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-white/60" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#7B2CFF]/40 transition-all"
                    >
                        <ChevronRight className="w-5 h-5 text-white/60" />
                    </button>
                </>
            )}

            {/* Image */}
            <motion.img
                key={image.id}
                src={image.objectUrl}
                alt={image.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
            />

            {/* Corner frame accents */}
            <div className="absolute top-14 left-4 w-8 h-8 border-t-2 border-l-2 border-[#7B2CFF]/30 pointer-events-none" />
            <div className="absolute top-14 right-4 w-8 h-8 border-t-2 border-r-2 border-[#7B2CFF]/30 pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#18E6FF]/30 pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#18E6FF]/30 pointer-events-none" />

            {/* Delete confirmation */}
            <AnimatePresence>
                {showConfirmDelete && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/80 z-20"
                        onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(false); }}
                    >
                        <div
                            className="p-6 rounded-xl bg-[#0a0a0f] border border-red-500/30 max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-sm text-white/80 mb-4 font-mono">
                                Delete <span className="text-red-400">{image.name}</span> from vault?
                            </p>
                            <div className="flex items-center gap-2 justify-end">
                                <button
                                    onClick={() => setShowConfirmDelete(false)}
                                    className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-xs font-mono text-white/60 hover:bg-white/20 transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => onDelete(image.id)}
                                    className="px-3 py-1.5 rounded-md bg-red-500/20 border border-red-500/40 text-xs font-mono text-red-400 hover:bg-red-500/30 transition-all"
                                >
                                    DELETE
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default SovereignGallery;

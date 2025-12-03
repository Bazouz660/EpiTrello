import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_BACKGROUND_COLOR = '#0f172a';

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const getBackgroundPreviewStyle = (background) => {
  if (!background) return {};
  if (background.type === 'image') {
    return {
      backgroundImage: `url(${background.thumbnail || background.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: background.value };
};

const BoardCreateModal = ({ onClose, onCreate, isCreating, createError }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundType, setBackgroundType] = useState('color');
  const [colorValue, setColorValue] = useState(DEFAULT_BACKGROUND_COLOR);
  const [imageData, setImageData] = useState('');
  const [imageName, setImageName] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleImageSelection = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageData(typeof reader.result === 'string' ? reader.result : '');
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, []);

  const previewBackground =
    backgroundType === 'image' && imageData
      ? { type: 'image', value: imageData }
      : { type: 'color', value: colorValue };

  const isCreateDisabled = isCreating || (backgroundType === 'image' && !imageData);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (backgroundType === 'image' && !imageData) return;

    const background =
      backgroundType === 'image' && imageData
        ? { type: 'image', value: imageData, thumbnail: imageData }
        : { type: 'color', value: colorValue || DEFAULT_BACKGROUND_COLOR };

    await onCreate({
      title: trimmedTitle,
      description: description.trim(),
      background,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        aria-label="Close create board modal"
        onClick={onClose}
        tabIndex={-1}
      />

      {/* Modal Container */}
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
                Create a new board
              </h2>
              <p className="text-sm text-slate-600">
                Give your board a title, then choose a background color or hero image.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Background Preview */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Background preview</p>
                <p className="text-xs text-slate-500">Updates as you change the form below.</p>
              </div>
              <div
                className="h-16 w-32 rounded-lg border border-slate-200"
                style={getBackgroundPreviewStyle(previewBackground)}
                aria-hidden="true"
              />
            </div>

            {/* Title & Description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="new-board-title" className="text-sm font-medium text-slate-700">
                  Board title
                </label>
                <input
                  id="new-board-title"
                  name="title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Website redesign"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="new-board-description"
                  className="text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <input
                  id="new-board-description"
                  name="description"
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add optional context for teammates"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Background Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Background</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="radio"
                    name="new-background-type"
                    value="color"
                    checked={backgroundType === 'color'}
                    onChange={() => setBackgroundType('color')}
                  />
                  Color
                </label>
                <label className="inline-flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="radio"
                    name="new-background-type"
                    value="image"
                    checked={backgroundType === 'image'}
                    onChange={() => setBackgroundType('image')}
                  />
                  Image
                </label>
              </div>
              {backgroundType === 'color' ? (
                <div className="flex flex-wrap items-center gap-4">
                  <input
                    type="color"
                    value={colorValue}
                    onChange={(event) => setColorValue(event.target.value)}
                    aria-label="Board color"
                    className="h-12 w-16 cursor-pointer rounded border border-slate-300 bg-transparent"
                  />
                  <input
                    type="text"
                    value={colorValue}
                    onChange={(event) => setColorValue(event.target.value)}
                    className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    placeholder="#0f172a"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelection}
                    className="w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700"
                  />
                  {imageData ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <img
                        src={imageData}
                        alt="Board background preview"
                        className="h-16 w-28 rounded-md object-cover"
                      />
                      <div className="space-y-1 text-sm text-slate-600">
                        {imageName && <p className="font-medium">{imageName}</p>}
                        <button
                          type="button"
                          onClick={() => {
                            setImageData('');
                            setImageName('');
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Upload a JPG or PNG. Large images will be stored as part of the board
                      background.
                    </p>
                  )}
                </div>
              )}
            </div>

            {createError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreateDisabled}
                className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {isCreating ? 'Creating…' : 'Create board'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

BoardCreateModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  isCreating: PropTypes.bool,
  createError: PropTypes.string,
};

export default BoardCreateModal;

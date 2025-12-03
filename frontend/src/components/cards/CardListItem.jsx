import PropTypes from 'prop-types';

const CardListItem = ({ card, onOpenDetail }) => (
  <button
    type="button"
    aria-label={`Open details for ${card.title}`}
    onClick={onOpenDetail}
    className="group w-full space-y-2 rounded-md border border-white/25 bg-white/10 p-3 text-left text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
  >
    <p className="text-sm font-semibold leading-snug text-white">{card.title}</p>
    {card.description && (
      <div
        aria-label="Card has description"
        className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80"
      >
        <svg
          viewBox="0 0 24 24"
          className="mr-1 h-3 w-3 fill-current text-white/70"
          aria-hidden="true"
        >
          <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h12V8h-4V4H6zm2 8h8v2H8v-2zm0 4h8v2H8v-2zm0-8h4v2H8V8z" />
        </svg>
        <span className="sr-only">Has description</span>
      </div>
    )}
    <p className="text-[11px] text-white/70">Click to view details</p>
  </button>
);

CardListItem.propTypes = {
  card: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  onOpenDetail: PropTypes.func.isRequired,
};

export default CardListItem;

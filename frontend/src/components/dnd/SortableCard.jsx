import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PropTypes from 'prop-types';

const SortableCard = ({ id, listId, children, disabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
    data: {
      type: 'card',
      listId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none ${isDragging ? 'z-50' : ''}`}
    >
      {children}
    </div>
  );
};

SortableCard.propTypes = {
  id: PropTypes.string.isRequired,
  listId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
};

SortableCard.defaultProps = {
  disabled: false,
};

export default SortableCard;

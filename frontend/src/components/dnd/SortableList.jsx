import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PropTypes from 'prop-types';

const SortableList = ({ id, children, disabled, activeDragType }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id,
      disabled,
      data: {
        type: 'list',
      },
    });

  // Only show "over" state when dragging another list, not when dragging a card
  const showOverState = isOver && activeDragType === 'list';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-none transition-all duration-200 ${
        isDragging ? 'z-50 scale-[0.98] opacity-40' : showOverState ? 'scale-[1.02]' : ''
      }`}
    >
      {children({ attributes, listeners, isDragging, isOver: showOverState })}
    </div>
  );
};

SortableList.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  activeDragType: PropTypes.oneOf(['list', 'card', null]),
};

SortableList.defaultProps = {
  disabled: false,
  activeDragType: null,
};

export default SortableList;

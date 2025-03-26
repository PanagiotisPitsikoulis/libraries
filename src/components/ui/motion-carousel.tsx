'use client';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type Transition, motion, useMotionValue } from 'motion/react';
import {
  Children,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export type MotionCarouselContextType = {
  index: number;
  setIndex: (newIndex: number) => void;
  itemsCount: number;
  setItemsCount: (newItemsCount: number) => void;
  disableDrag: boolean;
};

const MotionCarouselContext = createContext<MotionCarouselContextType | undefined>(
  undefined
);

function useMotionCarousel() {
  const context = useContext(MotionCarouselContext);
  if (!context) {
    throw new Error('useMotionCarousel must be used within an MotionCarouselProvider');
  }
  return context;
}

export type MotionCarouselProviderProps = {
  children: ReactNode;
  initialIndex?: number;
  onIndexChange?: (newIndex: number) => void;
  disableDrag?: boolean;
};

function MotionCarouselProvider({
  children,
  initialIndex = 0,
  onIndexChange,
  disableDrag = false,
}: MotionCarouselProviderProps) {
  const [index, setIndex] = useState<number>(initialIndex);
  const [itemsCount, setItemsCount] = useState<number>(0);

  const handleSetIndex = (newIndex: number) => {
    setIndex(newIndex);
    onIndexChange?.(newIndex);
  };

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  return (
    <MotionCarouselContext.Provider
      value={{
        index,
        setIndex: handleSetIndex,
        itemsCount,
        setItemsCount,
        disableDrag,
      }}
    >
      {children}
    </MotionCarouselContext.Provider>
  );
}

export type MotionCarouselProps = {
  children: ReactNode;
  className?: string;
  initialIndex?: number;
  index?: number;
  onIndexChange?: (newIndex: number) => void;
  disableDrag?: boolean;
};

function MotionCarousel({
  children,
  className,
  initialIndex = 0,
  index: externalIndex,
  onIndexChange,
  disableDrag = false,
}: MotionCarouselProps) {
  const [internalIndex, setInternalIndex] = useState<number>(initialIndex);
  const isControlled = externalIndex !== undefined;
  const currentIndex = isControlled ? externalIndex : internalIndex;

  const handleIndexChange = (newIndex: number) => {
    if (!isControlled) {
      setInternalIndex(newIndex);
    }
    onIndexChange?.(newIndex);
  };

  return (
    <MotionCarouselProvider
      initialIndex={currentIndex}
      onIndexChange={handleIndexChange}
      disableDrag={disableDrag}
    >
      <div className={cn('group/hover relative', className)}>
        <div className='overflow-hidden'>{children}</div>
      </div>
    </MotionCarouselProvider>
  );
}

export type MotionCarouselNavigationProps = {
  className?: string;
  classNameButton?: string;
  alwaysShow?: boolean;
};

function MotionCarouselNavigation({
  className,
  classNameButton,
  alwaysShow,
}: MotionCarouselNavigationProps) {
  const { index, setIndex, itemsCount } = useMotionCarousel();

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-[-12.5%] top-1/2 flex w-[125%] -translate-y-1/2 justify-between px-2',
        className
      )}
    >
      <button
        type='button'
        aria-label='Previous slide'
        className={cn(
          'pointer-events-auto h-fit w-fit rounded-full bg-zinc-50 p-2 transition-opacity duration-300 dark:bg-zinc-950',
          alwaysShow
            ? 'opacity-100'
            : 'opacity-0 group-hover/hover:opacity-100',
          alwaysShow
            ? 'disabled:opacity-40'
            : 'group-hover/hover:disabled:opacity-40',
          classNameButton
        )}
        disabled={index === 0}
        onClick={() => {
          if (index > 0) {
            setIndex(index - 1);
          }
        }}
      >
        <ChevronLeft
          className='stroke-zinc-600 dark:stroke-zinc-50'
          size={16}
        />
      </button>
      <button
        type='button'
        className={cn(
          'pointer-events-auto h-fit w-fit rounded-full bg-zinc-50 p-2 transition-opacity duration-300 dark:bg-zinc-950',
          alwaysShow
            ? 'opacity-100'
            : 'opacity-0 group-hover/hover:opacity-100',
          alwaysShow
            ? 'disabled:opacity-40'
            : 'group-hover/hover:disabled:opacity-40',
          classNameButton
        )}
        aria-label='Next slide'
        disabled={index + 1 === itemsCount}
        onClick={() => {
          if (index < itemsCount - 1) {
            setIndex(index + 1);
          }
        }}
      >
        <ChevronRight
          className='stroke-zinc-600 dark:stroke-zinc-50'
          size={16}
        />
      </button>
    </div>
  );
}

export type MotionCarouselIndicatorProps = {
  className?: string;
  classNameButton?: string;
};

function MotionCarouselIndicator({
  className,
  classNameButton,
}: MotionCarouselIndicatorProps) {
  const { index, itemsCount, setIndex } = useMotionCarousel();

  return (
    <div
      className={cn(
        'absolute bottom-0 z-10 flex w-full items-center justify-center',
        className
      )}
    >
      <div className='flex space-x-2'>
        {Array.from({ length: itemsCount }, (_, i) => (
          <button
            key={i}
            type='button'
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              'h-2 w-2 rounded-full transition-opacity duration-300',
              index === i
                ? 'bg-zinc-950 dark:bg-zinc-50'
                : 'bg-zinc-900/50 dark:bg-zinc-100/50',
              classNameButton
            )}
          />
        ))}
      </div>
    </div>
  );
}

export type MotionCarouselContentProps = {
  children: ReactNode;
  className?: string;
  transition?: Transition;
};

function MotionCarouselContent({
  children,
  className,
  transition,
}: MotionCarouselContentProps) {
  const { index, setIndex, setItemsCount, disableDrag } = useMotionCarousel();
  const [visibleItemsCount, setVisibleItemsCount] = useState(1);
  const dragX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsLength = Children.count(children);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const options = {
      root: containerRef.current,
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      const visibleCount = entries.filter(
        (entry) => entry.isIntersecting
      ).length;
      setVisibleItemsCount(visibleCount);
    }, options);

    const childNodes = containerRef.current.children;
    for (const child of Array.from(childNodes)) {
      observer.observe(child);
    }

    return () => observer.disconnect();
  }, [children, setItemsCount]);

  useEffect(() => {
    if (!itemsLength) {
      return;
    }

    setItemsCount(itemsLength);
  }, [itemsLength, setItemsCount]);

  const onDragEnd = () => {
    const x = dragX.get();

    if (x <= -10 && index < itemsLength - 1) {
      setIndex(index + 1);
    } else if (x >= 10 && index > 0) {
      setIndex(index - 1);
    }
  };

  return (
    <motion.div
      drag={disableDrag ? false : 'x'}
      dragConstraints={
        disableDrag
          ? undefined
          : {
              left: 0,
              right: 0,
            }
      }
      dragMomentum={disableDrag ? undefined : false}
      style={{
        x: disableDrag ? undefined : dragX,
      }}
      animate={{
        translateX: `-${index * (100 / visibleItemsCount)}%`,
      }}
      onDragEnd={disableDrag ? undefined : onDragEnd}
      transition={
        transition || {
          damping: 18,
          stiffness: 90,
          type: 'spring',
          duration: 0.2,
        }
      }
      className={cn(
        'flex items-center',
        !disableDrag && 'cursor-grab active:cursor-grabbing',
        className
      )}
      ref={containerRef}
    >
      {children}
    </motion.div>
  );
}

export type MotionCarouselItemProps = {
  children: ReactNode;
  className?: string;
};

function MotionCarouselItem({ children, className }: MotionCarouselItemProps) {
  return (
    <motion.div
      className={cn(
        'w-full min-w-0 shrink-0 grow-0 overflow-hidden',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export {
  MotionCarousel,
  MotionCarouselContent,
  MotionCarouselNavigation,
  MotionCarouselIndicator,
  MotionCarouselItem,
  useMotionCarousel,
};

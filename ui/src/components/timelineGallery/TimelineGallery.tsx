import React, { useRef, useEffect, useReducer } from 'react'
import { useQuery, gql } from '@apollo/client'
import TimelineGroupDate from './TimelineGroupDate'
import PresentView from '../photoGallery/presentView/PresentView'
import useURLParameters from '../../hooks/useURLParameters'
import useScrollPagination from '../../hooks/useScrollPagination'
import PaginateLoader from '../PaginateLoader'
import { useTranslation } from 'react-i18next'
import {
  myTimeline,
  myTimelineVariables,
  myTimeline_myTimeline,
} from './__generated__/myTimeline'
import {
  getActiveTimelineImage as getActiveTimelineMedia,
  timelineGalleryReducer,
} from './timelineGalleryReducer'
import { urlPresentModeSetupHook } from '../photoGallery/mediaGalleryReducer'
import TimelineFilters from './TimelineFilters'
import client from '../../apolloClient'

export const MY_TIMELINE_QUERY = gql`
  query myTimeline(
    $onlyFavorites: Boolean
    $onlyShares: Boolean
    $limit: Int
    $offset: Int
    $fromDate: Time
  ) {
    myTimeline(
      onlyFavorites: $onlyFavorites
      onlyShares: $onlyShares
      fromDate: $fromDate
      paginate: { limit: $limit, offset: $offset }
    ) {
      id
      title
      type
      blurhash
      thumbnail {
        url
        width
        height
      }
      highRes {
        url
        width
        height
      }
      videoWeb {
        url
      }
      favorite
      shared
      album {
        id
        title
      }
      date
    }
  }
`

export type TimelineActiveIndex = {
  albumGroup: number
  media: number
}

export type TimelineGroup = {
  date: string
  albums: TimelineGroupAlbum[]
}

export type TimelineGroupAlbum = {
  id: string
  title: string
  media: myTimeline_myTimeline[]
}

const TimelineGallery = () => {
  const { t } = useTranslation()

  const { getParam, setParam } = useURLParameters()

  const onlyFavorites = getParam('favorites') == '1' ? true : false
  const setOnlyFavorites = (favorites: boolean) =>
    setParam('favorites', favorites ? '1' : null)

  const onlyShares = getParam('shares') == '1' ? true : false
  const setOnlyShares = (shares: boolean) =>
    setParam('shares', shares ? '1' : null)

  const filterDate = getParam('date')
  const setFilterDate = (x: string) => setParam('date', x)

  const favoritesNeedsRefresh = useRef(false)

  const [mediaState, dispatchMedia] = useReducer(timelineGalleryReducer, {
    presenting: false,
    timelineGroups: [],
    activeIndex: {
      media: -1,
      album: -1,
      date: -1,
    },
  })

    console.log("TimelineGallery:")
    console.log(mediaState)

  const { data, error, loading, refetch, fetchMore } = useQuery<
    myTimeline,
    myTimelineVariables
  >(MY_TIMELINE_QUERY, {
    variables: {
      onlyFavorites,
      onlyShares,
      fromDate: filterDate
        ? `${parseInt(filterDate) + 1}-01-01T00:00:00Z`
        : undefined,
      offset: 0,
      limit: 200,
    },
  })

  const { containerElem, finished: finishedLoadingMore } =
    useScrollPagination<myTimeline>({
      loading,
      fetchMore,
      data,
      getItems: data => data.myTimeline,
    })

  useEffect(() => {
    dispatchMedia({
      type: 'replaceTimelineGroups',
      timeline: data?.myTimeline || [],
    })
  }, [data])

  useEffect(() => {
    ;(async () => {
      await client.resetStore()
      await refetch({
        onlyFavorites,
        onlyShares,
        fromDate: filterDate
          ? `${parseInt(filterDate) + 1}-01-01T00:00:00Z`
          : undefined,
        offset: 0,
        limit: 200,
      })
    })()
  }, [filterDate])

  urlPresentModeSetupHook({
    dispatchMedia,
    openPresentMode: event => {
      dispatchMedia({
        type: 'openPresentMode',
        activeIndex: event.state.activeIndex,
      })
    },
  })

  useEffect(() => {
    favoritesNeedsRefresh.current = false
    refetch({
      onlyFavorites: onlyFavorites,
      onlyShares: onlyShares,
    })
  }, [onlyFavorites, onlyShares])

  if (error) {
    return <div>{error.message}</div>
  }

  const timelineGroups = mediaState.timelineGroups.map((_, i) => (
    <TimelineGroupDate
      key={i}
      groupIndex={i}
      mediaState={mediaState}
      dispatchMedia={dispatchMedia}
    />
  ))

  return (
    <div className="overflow-x-hidden">
      <TimelineFilters
        onlyFavorites={onlyFavorites}
        setOnlyFavorites={setOnlyFavorites}
        onlyShares={onlyShares}
        setOnlyShares={setOnlyShares}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
      />
      <div className="-mx-3 flex flex-wrap" ref={containerElem}>
        {timelineGroups}
      </div>
      <PaginateLoader
        active={!finishedLoadingMore && !loading}
        text={t('general.loading.paginate.media', 'Loading more media')}
      />
      {mediaState.presenting && (
        <PresentView
          activeMedia={getActiveTimelineMedia({ mediaState })!}
          dispatchMedia={dispatchMedia}
        />
      )}
    </div>
  )
}

export default TimelineGallery

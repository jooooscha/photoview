package dataloader

import (
	"time"

	"github.com/photoview/photoview/api/graphql/models"
	"gorm.io/gorm"
)

func NewUserSharedLoader(db *gorm.DB) *UserSharesLoader {
	return &UserSharesLoader{
		maxBatch: 100,
		wait:     5 * time.Millisecond,
		fetch: func(keys []*models.UserMediaData) ([]bool, []error) {

			userIDMap := make(map[int]struct{}, len(keys))
			mediaIDMap := make(map[int]struct{}, len(keys))
			for _, key := range keys {
				userIDMap[key.UserID] = struct{}{}
				mediaIDMap[key.MediaID] = struct{}{}
			}


			uniqueUserIDs := make([]int, len(userIDMap))
			uniqueMediaIDs := make([]int, len(mediaIDMap))

			count := 0
			for id := range userIDMap {
				uniqueUserIDs[count] = id
				count++
			}

			count = 0
			for id := range mediaIDMap {
				uniqueMediaIDs[count] = id
				count++
			}

			var userMediaShared []*models.UserMediaData
			err := db.Where("user_id IN (?)", uniqueUserIDs).Where("media_id IN (?)", uniqueMediaIDs).Where("shared = TRUE").Find(&userMediaShared).Error
            if err != nil {
				return nil, []error{err}
			}

			result := make([]bool, len(keys))
			for i, key := range keys {
				shared := false
				for _, fav := range userMediaShared {
					if fav.UserID == key.UserID && fav.MediaID == key.MediaID {
						shared = true
						break
					}
				}
				result[i] = shared
			}

			return result, nil
		},
	}
}

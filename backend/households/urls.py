from rest_framework.routers import DefaultRouter
from .views import (
    HouseholdPhotoViewSet,
    HouseholdViewSet,
    PersonnelViewSet,
    RegisteredHouseholdViewSet,
)

router = DefaultRouter()
router.register("households", HouseholdViewSet)
router.register("registered-households", RegisteredHouseholdViewSet)
router.register("personnel", PersonnelViewSet)
router.register("photos", HouseholdPhotoViewSet)

urlpatterns = router.urls

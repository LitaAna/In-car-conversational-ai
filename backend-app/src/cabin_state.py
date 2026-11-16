from .models import CabinState


def create_default_state() -> CabinState:
    return CabinState()

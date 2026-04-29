import json
import pytest
from app import app


@pytest.fixture
def client():
    """Create a test client for the app"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def sample_order():
    """Sample order data for testing"""
    return {
        "order_id": "ORD-001",
        "customer": "John Doe",
        "items": ["item1", "item2"]
    }


@pytest.fixture
def sample_shipment():
    """Sample shipment data for testing"""
    return {
        "shipment_id": "SHP-001",
        "origin": "New York",
        "destination": "Los Angeles",
        "estimated_delivery": "2026-02-20"
    }


@pytest.fixture
def sample_inventory():
    """Sample inventory data for testing"""
    return {
        "item_id": "ITM-001",
        "name": "Widget",
        "quantity": 100,
        "location": "Warehouse A",
        "category": "Electronics"
    }


# ============================================================================
# BASIC ENDPOINTS TESTS
# ============================================================================

def test_home(client):
    """Test home endpoint"""
    response = client.get("/")
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["status"] == "Running"
    assert data["service"] == "Logistics Service"
    assert "features" in data
    assert len(data["features"]) > 0


def test_health(client):
    """Test health check endpoint"""
    response = client.get("/health")
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["status"] == "UP"


# ============================================================================
# ORDER MANAGEMENT TESTS
# ============================================================================

def test_create_order_success(client, sample_order):
    """Test creating a valid order"""
    response = client.post("/order",
                          data=json.dumps(sample_order),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 201
    assert data["message"] == "Order created successfully"
    assert data["order"]["order_id"] == sample_order["order_id"]


def test_create_order_missing_id(client):
    """Test creating order without order_id"""
    response = client.post("/order",
                          data=json.dumps({"customer": "John"}),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data


def test_create_order_duplicate(client, sample_order):
    """Test creating duplicate order"""
    # Create first order
    client.post("/order",
               data=json.dumps(sample_order),
               content_type='application/json')

    # Try to create duplicate
    response = client.post("/order",
                          data=json.dumps(sample_order),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 409
    assert "error" in data


def test_get_order_success(client, sample_order):
    """Test retrieving an existing order"""
    # Create order first
    client.post("/order",
               data=json.dumps(sample_order),
               content_type='application/json')

    # Retrieve order
    response = client.get(f"/order/{sample_order['order_id']}")
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["order_id"] == sample_order["order_id"]


def test_get_order_not_found(client):
    """Test retrieving non-existent order"""
    response = client.get("/order/NONEXISTENT")
    data = json.loads(response.data)

    assert response.status_code == 404
    assert "error" in data


# ============================================================================
# SHIPMENT TRACKING TESTS
# ============================================================================

def test_create_shipment_success(client, sample_shipment):
    """Test creating a valid shipment"""
    response = client.post("/shipment",
                          data=json.dumps(sample_shipment),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 201
    assert data["message"] == "Shipment created successfully"
    assert data["shipment"]["shipment_id"] == sample_shipment["shipment_id"]
    assert data["shipment"]["status"] == "pending"


def test_create_shipment_missing_fields(client):
    """Test creating shipment with missing required fields"""
    response = client.post("/shipment",
                          data=json.dumps({"shipment_id": "SHP-002"}),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data
    assert "required" in data


def test_get_shipment_success(client, sample_shipment):
    """Test retrieving shipment status"""
    # Create shipment first
    client.post("/shipment",
               data=json.dumps(sample_shipment),
               content_type='application/json')

    # Get shipment
    response = client.get(f"/shipment/{sample_shipment['shipment_id']}")
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["shipment_id"] == sample_shipment["shipment_id"]
    assert "tracking_history" in data


def test_get_shipment_not_found(client):
    """Test retrieving non-existent shipment"""
    response = client.get("/shipment/NONEXISTENT")
    data = json.loads(response.data)

    assert response.status_code == 404
    assert "error" in data


def test_update_shipment_location(client, sample_shipment):
    """Test updating shipment location"""
    # Create shipment first
    client.post("/shipment",
               data=json.dumps(sample_shipment),
               content_type='application/json')

    # Update location
    update_data = {"location": "Chicago", "status": "in_transit"}
    response = client.put(f"/shipment/{sample_shipment['shipment_id']}/location",
                         data=json.dumps(update_data),
                         content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["shipment"]["current_location"] == "Chicago"
    assert data["shipment"]["status"] == "in_transit"
    assert len(data["shipment"]["tracking_history"]) == 2


def test_update_shipment_location_missing_data(client, sample_shipment):
    """Test updating shipment location without required data"""
    # Create shipment first
    client.post("/shipment",
               data=json.dumps(sample_shipment),
               content_type='application/json')

    # Try to update without location
    response = client.put(f"/shipment/{sample_shipment['shipment_id']}/location",
                         data=json.dumps({}),
                         content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data


def test_list_shipments(client, sample_shipment):
    """Test listing all shipments"""
    # Create a shipment
    client.post("/shipment",
               data=json.dumps(sample_shipment),
               content_type='application/json')

    # List shipments
    response = client.get("/shipments")
    data = json.loads(response.data)

    assert response.status_code == 200
    assert "count" in data
    assert "shipments" in data
    assert data["count"] >= 1


# ============================================================================
# INVENTORY MANAGEMENT TESTS
# ============================================================================

def test_get_inventory_empty(client):
    """Test getting inventory when empty"""
    response = client.get("/inventory")
    data = json.loads(response.data)

    assert response.status_code == 200
    assert "inventory" in data
    assert "count" in data


def test_add_inventory_item_success(client, sample_inventory):
    """Test adding a valid inventory item"""
    response = client.post("/inventory",
                          data=json.dumps(sample_inventory),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 201
    assert data["message"] == "Inventory item added successfully"
    assert data["item"]["item_id"] == sample_inventory["item_id"]
    assert data["item"]["quantity"] == sample_inventory["quantity"]


def test_add_inventory_item_missing_fields(client):
    """Test adding inventory item with missing fields"""
    response = client.post("/inventory",
                          data=json.dumps({"item_id": "ITM-002"}),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data


def test_add_inventory_item_negative_quantity(client):
    """Test adding inventory item with negative quantity"""
    invalid_item = {
        "item_id": "ITM-002",
        "name": "Invalid",
        "quantity": -10
    }
    response = client.post("/inventory",
                          data=json.dumps(invalid_item),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data


def test_add_inventory_item_invalid_quantity(client):
    """Test adding inventory item with invalid quantity type"""
    invalid_item = {
        "item_id": "ITM-003",
        "name": "Invalid",
        "quantity": "not-a-number"
    }
    response = client.post("/inventory",
                          data=json.dumps(invalid_item),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data


def test_get_inventory_item_success(client, sample_inventory):
    """Test getting specific inventory item"""
    # Add item first
    client.post("/inventory",
               data=json.dumps(sample_inventory),
               content_type='application/json')

    # Get item
    response = client.get(f"/inventory/{sample_inventory['item_id']}")
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["item_id"] == sample_inventory["item_id"]


def test_get_inventory_item_not_found(client):
    """Test getting non-existent inventory item"""
    response = client.get("/inventory/NONEXISTENT")
    data = json.loads(response.data)

    assert response.status_code == 404
    assert "error" in data


def test_update_stock_success(client, sample_inventory):
    """Test updating inventory stock"""
    # Add item first
    client.post("/inventory",
               data=json.dumps(sample_inventory),
               content_type='application/json')

    # Update stock
    response = client.put(f"/inventory/{sample_inventory['item_id']}/stock",
                         data=json.dumps({"quantity": 150}),
                         content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["item"]["quantity"] == 150


def test_update_stock_invalid_quantity(client, sample_inventory):
    """Test updating stock with invalid quantity"""
    # Add item first
    client.post("/inventory",
               data=json.dumps(sample_inventory),
               content_type='application/json')

    # Try to update with negative quantity
    response = client.put(f"/inventory/{sample_inventory['item_id']}/stock",
                         data=json.dumps({"quantity": -5}),
                         content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data


# ============================================================================
# ROUTE OPTIMIZATION TESTS
# ============================================================================

def test_optimize_route_success(client):
    """Test route optimization with valid data"""
    route_data = {
        "start": "New York",
        "waypoints": ["Philadelphia", "Baltimore", "Washington DC"],
        "end": "Atlanta"
    }
    response = client.post("/route/optimize",
                          data=json.dumps(route_data),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["message"] == "Route optimized successfully"
    assert "route" in data
    assert data["route"]["total_stops"] == 4  # 3 waypoints + end
    assert data["route"]["optimized"] is True


def test_optimize_route_missing_fields(client):
    """Test route optimization with missing fields"""
    response = client.post("/route/optimize",
                          data=json.dumps({"start": "New York"}),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data


def test_optimize_route_invalid_waypoints(client):
    """Test route optimization with invalid waypoints format"""
    route_data = {
        "start": "New York",
        "waypoints": "not-a-list",
        "end": "Atlanta"
    }
    response = client.post("/route/optimize",
                          data=json.dumps(route_data),
                          content_type='application/json')
    data = json.loads(response.data)

    assert response.status_code == 400
    assert "error" in data


# ============================================================================
# ERROR HANDLER TESTS
# ============================================================================

def test_404_error(client):
    """Test 404 error handler"""
    response = client.get("/nonexistent-endpoint")
    data = json.loads(response.data)

    assert response.status_code == 404
    assert "error" in data
from flask import Flask, jsonify, request, render_template
from datetime import datetime
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory storage (for demonstration - in production, use a database)
shipments = {}
inventory = {}
orders = {}

# Configuration
app.config['ENV'] = os.getenv('FLASK_ENV', 'production')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'


@app.route("/", methods=["GET"])
def home():
    """Serve the dashboard UI"""
    return render_template("index.html")


@app.route("/api", methods=["GET"])
def api_info():
    """Service information endpoint (JSON)"""
    return jsonify({
        "service": "Logistics Service",
        "status": "Running",
        "version": "2.0",
        "features": [
            "Shipment Tracking",
            "Inventory Management",
            "Route Optimization",
            "Order Management"
        ]
    })


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for container orchestration"""
    return jsonify({"status": "UP"}), 200


# ============================================================================
# ORDER MANAGEMENT
# ============================================================================

@app.route("/order", methods=["POST"])
def create_order():
    """Create a new order"""
    data = request.get_json()

    if not data or "order_id" not in data:
        return jsonify({"error": "Invalid order data - order_id is required"}), 400

    order_id = data["order_id"]


    if order_id in orders:
        return jsonify({"error": "Order already exists"}), 409

    orders[order_id] = {
        "order_id": order_id,
        "customer": data.get("customer", "Unknown"),
        "items": data.get("items", []),
        "status": "created",
        "created_at": datetime.utcnow().isoformat()
    }

    return jsonify({
        "message": "Order created successfully",
        "order": orders[order_id]
    }), 201


@app.route("/order/<order_id>", methods=["GET"])
def get_order(order_id):
    """Get order details by ID"""
    if order_id not in orders:
        return jsonify({"error": "Order not found"}), 404


    return jsonify(orders[order_id]), 200


# ============================================================================
# SHIPMENT TRACKING
# ============================================================================

@app.route("/shipment", methods=["POST"])
def create_shipment():
    """Create a new shipment"""
    data = request.get_json()

    required_fields = ["shipment_id", "origin", "destination"]
    if not data or not all(field in data for field in required_fields):
        return jsonify({
            "error": "Missing required fields",
            "required": required_fields
        }), 400

    shipment_id = data["shipment_id"]


    if shipment_id in shipments:
        return jsonify({"error": "Shipment already exists"}), 409

    shipments[shipment_id] = {
        "shipment_id": shipment_id,
        "origin": data["origin"],
        "destination": data["destination"],
        "status": "pending",
        "current_location": data["origin"],
        "created_at": datetime.utcnow().isoformat(),
        "estimated_delivery": data.get("estimated_delivery"),
        "tracking_history": [
            {
                "location": data["origin"],
                "status": "pending",
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
    }

    return jsonify({
        "message": "Shipment created successfully",
        "shipment": shipments[shipment_id]
    }), 201


@app.route("/shipment/<shipment_id>", methods=["GET"])
def get_shipment(shipment_id):
    """Get shipment status and tracking information"""
    if shipment_id not in shipments:
        return jsonify({"error": "Shipment not found"}), 404


    return jsonify(shipments[shipment_id]), 200


@app.route("/shipment/<shipment_id>/location", methods=["PUT"])
def update_shipment_location(shipment_id):
    """Update shipment location"""
    if shipment_id not in shipments:
        return jsonify({"error": "Shipment not found"}), 404

    data = request.get_json()
    if not data or "location" not in data:
        return jsonify({"error": "Location is required"}), 400

    shipment = shipments[shipment_id]
    shipment["current_location"] = data["location"]
    shipment["status"] = data.get("status", "in_transit")


    # Add to tracking history
    shipment["tracking_history"].append({
        "location": data["location"],
        "status": shipment["status"],
        "timestamp": datetime.utcnow().isoformat(),
        "notes": data.get("notes", "")
    })

    return jsonify({
        "message": "Location updated successfully",
        "shipment": shipment
    }), 200


@app.route("/shipments", methods=["GET"])
def list_shipments():
    """List all shipments with optional status filter"""
    status_filter = request.args.get('status')


    filtered_shipments = shipments.values()
    if status_filter:
        filtered_shipments = [s for s in shipments.values() if s['status'] == status_filter]


    return jsonify({
        "count": len(filtered_shipments),
        "shipments": list(filtered_shipments)
    }), 200


# ============================================================================
# INVENTORY MANAGEMENT
# ============================================================================

@app.route("/inventory", methods=["GET"])
def get_inventory():
    """Get all inventory items"""
    return jsonify({
        "count": len(inventory),
        "inventory": list(inventory.values())
    }), 200


@app.route("/inventory", methods=["POST"])
def add_inventory_item():
    """Add a new inventory item"""
    data = request.get_json()

    required_fields = ["item_id", "name", "quantity"]
    if not data or not all(field in data for field in required_fields):
        return jsonify({
            "error": "Missing required fields",
            "required": required_fields
        }), 400

    item_id = data["item_id"]


    if item_id in inventory:
        return jsonify({"error": "Item already exists"}), 409

    try:
        quantity = int(data["quantity"])
        if quantity < 0:
            return jsonify({"error": "Quantity must be non-negative"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a valid integer"}), 400

    inventory[item_id] = {
        "item_id": item_id,
        "name": data["name"],
        "quantity": quantity,
        "location": data.get("location", "Warehouse"),
        "category": data.get("category", "General"),
        "last_updated": datetime.utcnow().isoformat()
    }

    return jsonify({
        "message": "Inventory item added successfully",
        "item": inventory[item_id]
    }), 201


@app.route("/inventory/<item_id>", methods=["GET"])
def get_inventory_item(item_id):
    """Get specific inventory item"""
    if item_id not in inventory:
        return jsonify({"error": "Item not found"}), 404


    return jsonify(inventory[item_id]), 200


@app.route("/inventory/<item_id>/stock", methods=["PUT"])
def update_stock(item_id):
    """Update inventory stock quantity"""
    if item_id not in inventory:
        return jsonify({"error": "Item not found"}), 404

    data = request.get_json()
    if not data or "quantity" not in data:
        return jsonify({"error": "Quantity is required"}), 400

    try:
        quantity = int(data["quantity"])
        if quantity < 0:
            return jsonify({"error": "Quantity must be non-negative"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a valid integer"}), 400

    inventory[item_id]["quantity"] = quantity
    inventory[item_id]["last_updated"] = datetime.utcnow().isoformat()

    return jsonify({
        "message": "Stock updated successfully",
        "item": inventory[item_id]
    }), 200


# ============================================================================
# ROUTE OPTIMIZATION
# ============================================================================

@app.route("/route/optimize", methods=["POST"])
def optimize_route():
    """Calculate optimal route (simplified algorithm for demo)"""
    data = request.get_json()

    required_fields = ["start", "waypoints", "end"]
    if not data or not all(field in data for field in required_fields):
        return jsonify({
            "error": "Missing required fields",
            "required": required_fields
        }), 400

    # Simple demonstration algorithm (in production, use real routing API)
    waypoints = data["waypoints"]
    if not isinstance(waypoints, list):
        return jsonify({"error": "Waypoints must be a list"}), 400

    # Calculate "distance" (simplified - just count of stops)
    total_stops = len(waypoints) + 1  # waypoints + end
    estimated_time = total_stops * 30  # 30 minutes per stop (simplified)

    optimized_route = {
        "start": data["start"],
        "waypoints": waypoints,
        "end": data["end"],
        "total_stops": total_stops,
        "estimated_time_minutes": estimated_time,
        "optimized": True,
        "route_efficiency": "optimal"
    }

    return jsonify({
        "message": "Route optimized successfully",
        "route": optimized_route
    }), 200


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",   # Required for Docker
        port=5000,        # Must match Dockerfile EXPOSE
        debug=app.config['DEBUG']
    )

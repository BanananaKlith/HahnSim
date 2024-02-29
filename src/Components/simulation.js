import { useState,useEffect,useRef } from 'react'
import './css/simulation.css'
import axios from 'axios'
import Dijkstra from 'node-dijkstra';

export default function Simulation({ token })
{

    const [grid, setGrid] = useState({ Nodes: [], Connections: [], Edges: [] });
    const [orders, setOrders] = useState([]);
    const [route, setRoute] = useState(null);
    const [currentNode,setCurrentNode]=useState(0);
    const [transporterId,setTransporterId]=useState(1);
    const currentNodeRef = useRef(currentNode);
    const [cargoLoad,setcargoLoad]=useState(null);
    const [loadedOrders,setLoadedOrders]=useState(null);
    const [inTransit,setIntransit]=useState(false);
    const [cargoArrival,setCargoArrival]=useState(null);
    const [cargoCapacity,setCargoCapacity]=useState(1000)




useEffect(() => {
    simStart();},[]); 


function simStart() {
        if (!token) {
            console.error('Token is not available');
            return;
        }
    
        // Start the simulation
        axios.post("https://localhost:7115/Sim/Start", {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then((response) => {
            console.log("Simulation started:", response);
            initializeGrid();
            // Ensure orders are initialized after simulation has started
            initializeOrders();
   
            
        })
        .catch((error) => {
            console.error("Error starting simulation: ", error);
        });
    }
    
    
const initializeOrders = () => {
        axios.get("https://localhost:7115/Order/GetAllAvailable", {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then((response) => {
            console.log("Available orders fetched:", response.data);
            if (response.data.length > 0) {
                setOrders(response.data);
            } else {
                console.log("No available orders.");
                setTimeout(initializeOrders, 1000); // Retry after 1 second if no orders are available
            }
        })
        .catch((error) => {
            console.error("Error fetching orders data: ", error);
        });
    }
    
    
const initializeGrid=()=>{
           // Fetch grid data
       axios.get("https://localhost:7115/Grid/Get", {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then((response) => {
        console.log("Grid data fetched:", response);
        setGrid({
            Nodes: response.data.Nodes,
            Connections: response.data.Connections,
            Edges: response.data.Edges
        });
    
        // adjacency list:
        const adjacencyList = {};
    
        response.data.Connections.forEach(connection => {
            const cost = response.data.Edges.find(edge => edge.Id === connection.EdgeId).Cost;
    
            if (!adjacencyList[connection.FirstNodeId]) {
                adjacencyList[connection.FirstNodeId] = {};
            }
    
            adjacencyList[connection.FirstNodeId][connection.SecondNodeId] = cost;
        });
    
        // Create a new Dijkstra object
        const route = new Dijkstra();
    
        // Add nodes to the Dijkstra object
        for (const node in adjacencyList) {
            route.addNode(node, adjacencyList[node]);
        }
    
        setRoute(route);  // Save the Dijkstra object in state
    })
    .catch((error) => {
        console.error("Error fetching grid data: ", error);
    });
    }    


function simEnd(){
    if (!token) {
        console.error('Token is not available');
        return;
    }

    // Start the simulation
    axios.post("https://localhost:7115/Sim/Stop", {}, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then((response) => {
        console.log("Simulation stoped:", response);
    })
    .catch((error) => {
        console.error("Error starting simulation: ", error);
    });
 
    
    
  
}


const findShortestPath = (originId, targetId) => {
    if (route) {
        // Find the shortest path
        const path = route.path(originId.toString(), targetId.toString());
        console.log(path)
        // Check if a path was found
        if (Array.isArray(path) && path.length > 0) {
            return path;
        } else {
            console.log('No path found between nodes', originId, 'and', targetId);
            return null;
        }
    } else {
        console.error('Route object is not defined');
        return null;
    }
};



function acceptOrder(order){
    try {
        const response =  axios.post(`https://localhost:7115/Order/Accept?orderid=${order.id}`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log("POST request successful: ", response);

    } catch (error) {
        console.error("Error sending POST request: ", error);
    }
 }


const addTransporter=()=>{
  
            axios.post(`https://localhost:7115/CargoTransporter/Buy?positionNodeId=${0}`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(() => {
            }).catch((error) => {
                console.error('Error adding transporter:', error);
            });      
        
}


async function getTransporter() {
    try {
        let response = await axios.get(`https://localhost:7115/CargoTransporter/Get?transporterId=${transporterId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        while(response.data.inTransit){
            setIntransit(true);
            await new Promise(resolve => setTimeout(resolve, 3000)); 
            response = await axios.get(`https://localhost:7115/CargoTransporter/Get?transporterId=${transporterId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        // Introduce a delay before setting inTransit to false
        await new Promise(resolve => setTimeout(resolve, 6000)); // 2000 ms = 2 seconds
        setIntransit(false);
        console.log(response);
        setcargoLoad(response.data.load);
        setLoadedOrders(response.data.loadedOrders);
            
    } catch (error) {
        console.error(`Error fetching transporter :`, error);
    }
}



async function moveToNode(targetIds) {
    for (let i = 0; i < targetIds.length; i++) {
        const targetId = targetIds[i];
        try {
            await getTransporter();
            const response = await axios.put(`https://localhost:7115/CargoTransporter/Move?transporterId=${transporterId}&targetNodeId=${targetId}`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log(`Moved To Node ${targetId}`, response);
            // Update currentNode after moving
            setCurrentNode(targetId);
            currentNodeRef.current = targetId;

            // If this is the last element in targetIds, set setArrival
            if (i === targetIds.length - 1) {
                setCargoArrival("Reached Destination, Unloading...");
            }
        } catch (error) {
            console.error("Error moving to node: ", error);
        }
    }
}







const PowerOn = async () => {
    try {
        addTransporter()
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            acceptOrder(order);
            const foundPathToOriginNode = findShortestPath(currentNodeRef.current, order.originNodeId);
            const foundPathToTargetNode = findShortestPath(order.originNodeId, order.targetNodeId);
            // If either path is null, skip to the next iteration
            if (!foundPathToOriginNode || !foundPathToTargetNode) {
                console.log('One of the paths is null, skipping to next iteration');
                continue;
            }
            foundPathToOriginNode.shift();
            foundPathToTargetNode.shift();
            await moveToNode([...foundPathToOriginNode, ...foundPathToTargetNode]);
        }
    } catch (error) {
        console.error(error);
    }
}







return (
    <div className='sim_Wrapper'>
   {orders && orders.length > 0 
    ? <button style={{"padding":"0.7em","cursor":"pointer","fontSize":"15px","backgroundColor":"black","color":"white","borderRadius":"10px"}} onClick={PowerOn}>Start Sim</button> 
    : <p>Finding Orders...</p>
}

    {grid && grid.Nodes && grid.Nodes[currentNode] ? <div>
    <div><h2>Cargo State</h2>
    <ul>
        <li style={{"display":"flex","alignItems":"center"}}><h3>Current Position:</h3> {grid.Nodes[currentNode].Name}</li>
        <li style={{"display":"flex","alignItems":"center"}}><h3>In Transit:</h3>
          {
          inTransit ? 'True' : 
          <span style={{color: 'red', fontWeight: 'bold'}}>False</span>
             }
        </li>
         <li style={{"display":"flex","alignItems":"center"}}>
             <h3>Cargo Load:</h3>
             {cargoLoad ? cargoLoad : "No Load"}
        </li>
        <li style={{"display":"flex","alignItems":"center"}}>
            <h3>Loaded Orders:</h3>
            {loadedOrders && loadedOrders.length > 0 
                ? loadedOrders.map((order, index) => <div key={index}>
                    <ul>     <li>Order Id Number: {order.id}</li>
                   <li>Coming from Node: {grid.Nodes[order.originNodeId].Name}</li>
                   <li>Going to Node: {grid.Nodes[order.targetNodeId].Name}</li>
                   <li>Load: {order.load}</li>
                   <li>Value: {order.value}</li></ul>
              
                    </div>) 
                : "No Loaded Orders"}
        </li>

        <li style={{"display":"flex","alignItems":"center"}}><h3>Vehicle Capacity:</h3>{cargoCapacity}</li>
        {cargoArrival?<li style={{"display":"flex","alignItems":"center"}}><h3>Congratulations</h3>{cargoArrival}</li>:null}
    </ul>
    <div>
    </div>
    </div>
</div>:null}

</div>

);

    
}

